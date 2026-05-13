import json
import logging
import re
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database.models import Deployment, Model
from services.ssh_service import SSHService

logger = logging.getLogger(__name__)

REMOTE_MODEL_DIR = "/opt/models"

MODEL_PATH_PATTERNS = [
    f"{REMOTE_MODEL_DIR}/",
    "/workspace/",
]


def scan_server_containers(db: Session, server) -> dict:
    """
    通过 GPU PID 扫描服务器上的模型服务, 补录到部署表

    流程:
    1. nvidia-smi 获取所有使用 GPU 的进程 (PID + GPU ID + 显存)
    2. 通过 PID 查找所属容器
    3. docker inspect 获取容器完整配置
    4. 解析启动命令/脚本提取端口、模型路径等
    5. 匹配模型并创建/同步部署记录
    6. 清理该服务器上已不存在容器的所有部署记录

    Returns: {"scanned": N, "added": M, "synced": K, "skipped": P, "removed": R, "errors": [...]}
    """
    result = {"scanned": 0, "added": 0, "synced": 0, "skipped": 0, "removed": 0, "errors": []}

    if not server.ssh_key:
        logger.warning(f"服务器 {server.name} 没有 SSH key, 跳过扫描")
        result["errors"].append(f"服务器 {server.name} 没有 SSH key")
        return result

    ssh = None
    try:
        ssh = SSHService(
            host=server.ip,
            username=server.ssh_user,
            key_content=server.ssh_key,
            port=server.ssh_port,
        )

        # Step 1: Get GPU processes via nvidia-smi
        gpu_processes = ssh.get_gpu_processes()
        logger.info(f"扫描服务器 {server.name} ({server.ip}), 发现 {len(gpu_processes)} 个 GPU 进程")

        # Group processes by PID (a PID may use multiple GPUs)
        pid_map = {}
        for proc in gpu_processes:
            pid = proc["pid"]
            if pid not in pid_map:
                pid_map[pid] = {
                    "gpu_ids": [],
                    "total_gpu_mem_mi": 0,
                }
            pid_map[pid]["gpu_ids"].append(proc["gpu_id"])
            pid_map[pid]["total_gpu_mem_mi"] += proc["gpu_mem_mi"]

        # Get nvidia-smi output to calculate GPU memory utilization
        nvidia_output, _ = _get_nvidia_smi_full(ssh)

        # Map PID to container info, then aggregate GPU data per container
        container_info_map = {}  # container_name -> {"gpu_ids": set, "total_gpu_mem_mi": int, "runtime": str, "container_id": str}
        skipped_pids = 0
        for pid, pid_info in pid_map.items():
            container_info = ssh.get_pid_container_info(pid)
            if not container_info:
                logger.debug(f"PID {pid} 未找到所属容器, 跳过")
                skipped_pids += 1
                continue
            name = container_info["name"]
            if name not in container_info_map:
                container_info_map[name] = {
                    "gpu_ids": set(),
                    "total_gpu_mem_mi": 0,
                    "runtime": container_info.get("runtime", "unknown"),
                    "container_id": container_info.get("container_id", ""),
                }
            for gid in pid_info["gpu_ids"]:
                container_info_map[name]["gpu_ids"].add(gid)
            container_info_map[name]["total_gpu_mem_mi"] += pid_info["total_gpu_mem_mi"]

        # Track all found container names for this server
        found_container_names = set()

        # Process each container with aggregated GPU info
        result["skipped"] += skipped_pids
        for container_name, agg_info in container_info_map.items():
            found_container_names.add(container_name)
            result["scanned"] += 1

            try:
                # Inspect container based on runtime type
                if agg_info.get("runtime") == "containerd":
                    # K8s containerd - use crictl to inspect
                    container_info = ssh.inspect_k8s_container(agg_info["container_id"])
                    if not container_info:
                        logger.warning(f"无法检查 K8s 容器 {container_name}, 跳过")
                        result["skipped"] += 1
                        continue
                else:
                    # Docker container
                    container_info = ssh.inspect_container(container_name)
                    if not container_info:
                        logger.warning(f"无法检查容器 {container_name}, 跳过")
                        result["skipped"] += 1
                        continue

                # Enrich container info with aggregated GPU data from all PIDs
                container_info["gpu_ids"] = sorted(agg_info["gpu_ids"])
                container_info["total_gpu_mem_mi"] = agg_info["total_gpu_mem_mi"]

                # Extract port and model info from startup command/script
                startup_info = _extract_from_startup(ssh, container_info)
                container_info["port"] = container_info.get("port") or startup_info.get("port")
                container_info["model_path"] = container_info.get("model_path") or startup_info.get("model_path")
                container_info["model_name"] = startup_info.get("model_name")

                # Step 4: Check if deployment record already exists (by server_id + service_name)
                existing = db.query(Deployment).filter(
                    Deployment.service_name == container_name,
                    Deployment.server_id == server.id,
                ).first()

                if existing:
                    _sync_deployment_status(db, existing, container_info)
                    result["synced"] += 1
                    logger.info(f"同步部署记录: {container_name} -> {container_info['status']}")
                else:
                    model_id = _try_auto_match_model(db, container_info)
                    if model_id is not None:
                        _create_deployment_from_container(
                            db, server, container_info, model_id
                        )
                        result["added"] += 1
                        logger.info(f"自动补录部署: {container_name} (model_id={model_id})")
                    else:
                        result["skipped"] += 1
                        model_path_info = container_info.get("model_path", "") or container_info.get("model_name", "")
                        logger.info(
                            f"跳过容器 {container_name}: 无法匹配模型 "
                            f"(模型路径: {model_path_info})"
                        )
            except Exception as e:
                result["errors"].append(f"处理容器 {container_name} 时出错: {str(e)}")
                logger.error(f"处理容器 {container_name} 时出错: {str(e)}")

        # Step 5: Remove stale deployments that no longer have a running container
        # Clean up ALL deployments (scanned + manual) where container no longer exists
        all_deploys = db.query(Deployment).filter(
            Deployment.server_id == server.id,
        ).all()
        for dep in all_deploys:
            if dep.service_name not in found_container_names:
                logger.info(f"清理过期部署记录: {dep.service_name} (容器已不存在, from_source={dep.from_source})")
                db.delete(dep)
                result["removed"] += 1
        if result["removed"] > 0:
            db.commit()

    except Exception as e:
        logger.error(f"扫描服务器 {server.name} 失败: {str(e)}")
        result["errors"].append(f"扫描服务器 {server.name} 失败: {str(e)}")
    finally:
        if ssh:
            ssh.close()

    return result


def _get_nvidia_smi_full(ssh):
    """获取完整的 nvidia-smi 输出用于解析 GPU 总显存"""
    try:
        cmd = "nvidia-smi --query-gpu=index,memory.total,memory.used --format=csv,noheader,nounits"
        exit_code, output, error = ssh.exec_command(cmd)
        gpu_info = {}
        for line in output.strip().split("\n"):
            line = line.strip()
            if not line:
                continue
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 3:
                gpu_info[int(parts[0])] = {
                    "total_mi": int(parts[1]),
                    "used_mi": int(parts[2]),
                }
        return gpu_info, exit_code == 0
    except Exception:
        return {}, False


def _extract_from_startup(ssh, container_info):
    """
    从容器的启动命令或启动脚本中提取部署信息

    提取:
    - port: 服务端口
    - model_path: 模型路径
    - model_name: 模型名称 (从路径中提取)
    """
    result = {"port": None, "model_path": None, "model_name": None}
    env = container_info.get("env", [])
    command = container_info.get("command", [])

    # Convert env list to dict for easy lookup
    env_dict = {}
    for e in env:
        if "=" in e:
            k, v = e.split("=", 1)
            env_dict[k] = v

    # Extract PORT from environment variables
    for key in ["PORT", "port", "server_port", "api_port", "http_port"]:
        if key in env_dict:
            try:
                result["port"] = int(env_dict[key])
                break
            except (ValueError, TypeError):
                pass

    # Extract MODEL path from environment variables
    for key in ["MODEL", "model_path", "MODEL_PATH", "model_dir", "MODEL_DIR"]:
        if key in env_dict:
            result["model_path"] = env_dict[key]
            break

    # If command is a script, try to read the script content
    script_content = None
    if command:
        cmd_str = " ".join(command) if isinstance(command, list) else str(command)
        # Check if it's a script path
        if cmd_str.endswith(".sh") or cmd_str.endswith(".py"):
            script_path = cmd_str.strip().split()[-1]
            if not script_path.startswith("/"):
                script_path = "/workspace/" + script_path
            script_content = ssh.read_remote_file(script_path)
        elif "bash" in cmd_str or "sh" in cmd_str:
            parts = cmd_str.split()
            for p in parts:
                if p.endswith(".sh"):
                    script_content = ssh.read_remote_file(p)
                    break

    if script_content:
        # Extract PORT from script
        port_match = re.search(r'PORT\s*=\s*["\']?(\d+)["\']?', script_content)
        if port_match:
            result["port"] = int(port_match.group(1))

        # Also check for --port argument
        port_match2 = re.search(r'--port\s+(\d+)', script_content)
        if port_match2:
            result["port"] = int(port_match2.group(1))

        # Extract model path from script
        model_match = re.search(r'MODEL\s*=\s*["\']?([^"\n\']+)["\']?', script_content)
        if model_match:
            result["model_path"] = model_match.group(1).strip()

        model_match2 = re.search(r'--model(?:_path|-dir)?\s+["\']?([^"\s\']+)["\']?', script_content)
        if model_match2:
            result["model_path"] = model_match2.group(1).strip()

    # Extract model name from model path
    if result["model_path"]:
        result["model_name"] = result["model_path"].rstrip("/").split("/")[-1]

    return result


def _sync_deployment_status(db: Session, deployment: Deployment, container_info: dict):
    """同步部署状态到实际容器状态"""
    container_status = container_info.get("status", "unknown")
    if container_status == "running":
        if deployment.status != "running":
            deployment.status = "running"
    elif container_status in ("exited", "dead"):
        if deployment.status == "running":
            deployment.status = "failed"

    # Update GPU IDs from actual nvidia-smi data
    gpu_ids = container_info.get("gpu_ids", [])
    if gpu_ids:
        gpu_str = ",".join(str(g) for g in gpu_ids)
        if deployment.gpus != gpu_str:
            deployment.gpus = gpu_str

    # Update detected_model_name — prefer model_name from startup env, fall back to host mount path
    generic_names = {"llm_models", "models", "model", "data", "workspace", "home", "opt"}
    detected = ""
    # Strategy 1: model_name from startup (env MODEL variable)
    if container_info.get("model_name"):
        detected = container_info["model_name"]
    # Strategy 2: model_name_from_host (skip generic names)
    elif container_info.get("model_name_from_host"):
        host_name = container_info["model_name_from_host"]
        if host_name.lower() not in generic_names:
            detected = host_name

    if detected and deployment.detected_model_name != detected:
        registered_model = db.query(Model).filter(
            or_(
                Model.name == detected,
                Model.path.endswith(f"/{detected}"),
            )
        ).first()
        if registered_model:
            deployment.detected_model_name = detected
            if deployment.model_id != registered_model.id:
                deployment.model_id = registered_model.id

    deployment.yaml_content = json.dumps(container_info, indent=2, ensure_ascii=False)
    db.commit()


def _try_auto_match_model(db: Session, container_info: dict) -> int | None:
    """
    尝试从容器挂载路径自动匹配模型

    匹配策略 (按优先级):
    1. 优先使用从启动命令/脚本中提取的 model_name (最可靠, 来自 env MODEL 变量)
    2. 使用从宿主机挂载路径提取的 model_name_from_host (仅当不是通用目录名时)
    3. 从 Mounts Destination 路径中提取
    4. 从 model_path 中提取最后一段目录名作为兜底
    5. 如果 model_path 包含已注册模型的路径关键词，也尝试匹配
    """
    model_path = container_info.get("model_path", "")

    # Strategy 1: Use extracted model name from startup env/command (most reliable)
    model_name = container_info.get("model_name")

    # Strategy 2: Use model name from host mount path (skip generic names)
    generic_names = {"llm_models", "models", "model", "data", "workspace", "home", "opt"}
    if not model_name and container_info.get("model_name_from_host"):
        host_name = container_info["model_name_from_host"]
        if host_name.lower() not in generic_names:
            model_name = host_name

    # Strategy 3: Check mounts destination path
    if not model_name:
        mounts = container_info.get("mounts", [])
        for mount in mounts:
            dest = mount.get("Destination", "")
            for pattern in MODEL_PATH_PATTERNS:
                if dest.startswith(pattern):
                    candidate = dest.replace(pattern, "").split("/")[0]
                    if candidate.lower() not in generic_names:
                        model_name = candidate
                    break
            if model_name:
                break

    # Strategy 4: Fallback — extract model name from model_path directly
    if not model_name and model_path:
        model_name = model_path.rstrip("/").split("/")[-1]

    if not model_name:
        return None

    # Query models table for matching model
    model = db.query(Model).filter(
        or_(
            Model.name == model_name,
            Model.path.endswith(f"/{model_name}"),
        )
    ).first()

    # Strategy 5: If no exact match, try matching model_path against all registered models
    if not model and model_path:
        all_models = db.query(Model).all()
        for m in all_models:
            if m.name and m.name in model_path:
                model = m
                break
            # Check if the registered model path (directory name) is a substring of model_path
            if m.path:
                path_dir = m.path.rstrip("/").split("/")[-1]
                if path_dir and path_dir in model_path:
                    model = m
                    break

    if model:
        return model.id

    return None


def _create_deployment_from_container(
    db: Session, server, container_info: dict, model_id: int
):
    """从容器信息创建部署记录"""
    gpus = container_info.get("gpu_ids", [])
    if not gpus:
        gpus = container_info.get("gpus", ["0"])

    # Convert GPU IDs to string list
    gpu_str = ",".join(str(g) for g in gpus)

    # Detected model name from host mount path or startup config
    detected_name = container_info.get("model_name_from_host") or container_info.get("model_name", "")

    deploy = Deployment(
        service_name=container_info["name"],
        server_id=server.id,
        model_id=model_id,
        image=container_info.get("image", "unknown"),
        port=container_info.get("port") or 0,
        gpus=gpu_str,
        status="running" if container_info.get("running") else "failed",
        yaml_content=json.dumps(container_info, indent=2, ensure_ascii=False),
        from_source="scanned",
        detected_model_name=detected_name if detected_name else None,
    )
    db.add(deploy)
    db.commit()
    db.refresh(deploy)
    logger.info(f"创建部署记录: id={deploy.id}, service_name={deploy.service_name}")
