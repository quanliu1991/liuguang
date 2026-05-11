import logging
import os
import subprocess
import tarfile
import tempfile
import threading
from services.ssh_service import SSHService
from services.yaml_service import render_deploy_yaml
from api.deploy import update_deployment_status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

REMOTE_MODEL_DIR = "/opt/models"
REMOTE_YAML_PATH = "/tmp/deploy_chat.yaml"
REMOTE_KEY_DIR = "/opt/keys"

# Common directories to search for models on the target server
REMOTE_MODEL_SEARCH_DIRS = [
    "/opt",
    "/workspace",
    "/data/models",
    "/home",
]

# In-memory progress store: {deploy_id: {"step": str, "message": str, "percent": int, "status": str}}
_deploy_progress: dict[int, dict] = {}
_progress_lock = threading.Lock()


def set_deploy_progress(deploy_id: int, step: str, message: str, percent: int, status: str = "running"):
    with _progress_lock:
        _deploy_progress[deploy_id] = {
            "step": step,
            "message": message,
            "percent": percent,
            "status": status,
        }


def get_deploy_progress(deploy_id: int) -> dict | None:
    with _progress_lock:
        return _deploy_progress.get(deploy_id)


def clear_deploy_progress(deploy_id: int):
    with _progress_lock:
        _deploy_progress.pop(deploy_id, None)


def _search_model_on_server(ssh: SSHService, model_name: str) -> str | None:
    """在目标服务器上搜索模型目录, 按优先级遍历常见路径

    Returns:
        找到的模型绝对路径, 或 None
    """
    for search_dir in REMOTE_MODEL_SEARCH_DIRS:
        cmd = f"find {search_dir} -maxdepth 3 -type d -name '{model_name}' 2>/dev/null | head -1"
        exit_code, output, _ = ssh.exec_command(cmd, timeout=60)
        if exit_code == 0:
            found_path = output.strip()
            if found_path:
                logger.info(f"在目标服务器找到模型: {found_path}")
                return found_path
    return None


def _sync_model_via_rsync(local_model_path, remote_model_path, server, deploy_id):
    """使用 rsync 同步模型文件到远程服务器"""
    logger.info(f"[部署 {deploy_id}] 使用 rsync 同步模型")
    rsync_cmd = (
        f"rsync -avz {local_model_path}/ "
        f"{server.ssh_user}@{server.ip}:{remote_model_path}/"
    )
    result = subprocess.run(
        rsync_cmd, shell=True, capture_output=True, text=True, timeout=3600
    )
    if result.returncode != 0:
        raise RuntimeError(f"rsync 同步失败: {result.stderr}")
    logger.info(f"[部署 {deploy_id}] 模型同步成功 (rsync)")


def _sync_model_via_tar(ssh, local_model_path, remote_model_dir, model_name, deploy_id):
    """使用 tar + SFTP 同步模型文件到远程服务器"""
    logger.info(f"[部署 {deploy_id}] 打包模型文件: {local_model_path}")
    set_deploy_progress(deploy_id, "sync_model", "正在打包模型文件...", 30)
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tar_path = tmp.name

    try:
        with tarfile.open(tar_path, "w:gz") as tar:
            tar.add(local_model_path, arcname=model_name)

        tar_size = os.path.getsize(tar_path)
        size_mb = tar_size / 1024 / 1024
        logger.info(f"[部署 {deploy_id}] 模型打包完成, 大小: {size_mb:.1f} MB")
        set_deploy_progress(deploy_id, "upload_model", f"正在上传模型 ({size_mb:.0f} MB)...", 40)

        remote_tar_path = f"/tmp/{model_name}.tar.gz"
        logger.info(f"[部署 {deploy_id}] 上传模型到远程: {remote_tar_path}")
        ssh.upload_file(tar_path, remote_tar_path)

        set_deploy_progress(deploy_id, "extract_model", "正在解压模型文件...", 60)
        logger.info(f"[部署 {deploy_id}] 解压模型到 {remote_model_dir}")
        exit_code, output, error = ssh.exec_command(
            f"mkdir -p {remote_model_dir} && tar -xzf {remote_tar_path} -C {remote_model_dir} && rm {remote_tar_path}",
            timeout=1800,
        )
        if exit_code != 0:
            raise RuntimeError(f"模型解压失败: {error}")

        set_deploy_progress(deploy_id, "sync_model_done", "模型同步完成", 70)
        logger.info(f"[部署 {deploy_id}] 模型同步成功 (tar)")
    finally:
        if os.path.exists(tar_path):
            os.remove(tar_path)


def _run_deployment_impl(
    db: Session,
    deploy_id: int,
    server,
    model,
    image: str,
    port: int,
    gpus: str,
    consul_host: str,
    consul_token: str,
    service_name: str,
):
    """实际执行部署逻辑 (内部函数, 由后台线程调用)"""
    gpu_list = gpus.split(",")
    tp_size = len(gpu_list)
    ssh = None

    try:
        # 1. 校验 GPU 是否空闲
        set_deploy_progress(deploy_id, "check_gpu", "正在校验 GPU 状态...", 5)
        logger.info(f"[部署 {deploy_id}] 步骤1: 校验 GPU 空闲")
        ssh = SSHService(
            host=server.ip,
            username=server.ssh_user,
            key_content=server.ssh_key,
        )

        exit_code, output, error = ssh.exec_command(
            "nvidia-smi --query-gpu=index,memory.used,memory.total --format=csv,noheader"
        )
        if exit_code != 0:
            raise RuntimeError(f"无法获取 GPU 状态: {error}")

        gpu_lines = output.strip().split("\n")
        for gpu_id in gpu_list:
            gpu_id = gpu_id.strip()
            for line in gpu_lines:
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 3 and parts[0] == gpu_id:
                    used = int(parts[1].replace(" MiB", ""))
                    if used > 100:
                        raise RuntimeError(f"GPU {gpu_id} 已被占用 (已使用 {used} MiB)")

        # 2. 校验 Port 是否占用
        set_deploy_progress(deploy_id, "check_port", f"正在检查端口 {port} 是否占用...", 15)
        logger.info(f"[部署 {deploy_id}] 步骤2: 校验 Port {port} 是否占用")
        exit_code, output, error = ssh.exec_command(f"ss -tlnp | grep :{port}")
        if exit_code == 0:
            raise RuntimeError(f"Port {port} 已被占用")

        # 3. 检查模型是否存在 / 同步
        set_deploy_progress(deploy_id, "check_model", "正在检查模型是否存在...", 25)
        logger.info(f"[部署 {deploy_id}] 步骤3: 检查/同步模型")

        # 先在目标服务器搜索模型 (不局限于 /opt/models)
        remote_model_path = _search_model_on_server(ssh, model.name)
        remote_key_dir = f"{REMOTE_KEY_DIR}/{model.name}"

        if remote_model_path:
            set_deploy_progress(deploy_id, "check_model_done", f"模型已存在: {remote_model_path}", 30)
            logger.info(f"[部署 {deploy_id}] 目标服务器已有模型: {remote_model_path}")
        else:
            logger.info(f"[部署 {deploy_id}] 模型未找到, 开始同步到 {REMOTE_MODEL_DIR}")
            if not os.path.exists(model.path):
                raise RuntimeError(f"本地模型路径不存在: {model.path}")

            remote_model_path = f"{REMOTE_MODEL_DIR}/{model.name}"

            # 优先使用 rsync, 失败则回退到 tar + SFTP
            try:
                _sync_model_via_rsync(model.path, remote_model_path, server, deploy_id)
            except RuntimeError as e:
                if "rsync" in str(e).lower():
                    logger.warning(f"[部署 {deploy_id}] rsync 不可用, 切换到 tar 模式")
                    _sync_model_via_tar(ssh, model.path, REMOTE_MODEL_DIR, model.name, deploy_id)
                else:
                    raise

        # 3.5 同步 key 文件到远程服务器
        if model.key_path and os.path.exists(model.key_path):
            set_deploy_progress(deploy_id, "sync_key", "正在同步 key 文件...", 75)
            logger.info(f"[部署 {deploy_id}] 步骤3.5: 同步 key 文件到远程")
            try:
                remote_key_target = f"{remote_key_dir}"
                exit_code, output, error = ssh.exec_command(f"mkdir -p {remote_key_target}")
                if exit_code != 0:
                    raise RuntimeError(f"创建 key 目录失败: {error}")

                if os.path.isfile(model.key_path):
                    ssh.upload_file(model.key_path, f"{remote_key_target}")
                elif os.path.isdir(model.key_path):
                    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
                        tar_path = tmp.name
                    try:
                        with tarfile.open(tar_path, "w:gz") as tar:
                            for item in os.listdir(model.key_path):
                                item_path = os.path.join(model.key_path, item)
                                tar.add(item_path, arcname=item)
                        remote_tar_path = f"/tmp/{model.name}_key.tar.gz"
                        ssh.upload_file(tar_path, remote_tar_path)
                        ssh.exec_command(f"tar -xzf {remote_tar_path} -C {remote_key_target} && rm {remote_tar_path}")
                    finally:
                        if os.path.exists(tar_path):
                            os.remove(tar_path)

                logger.info(f"[部署 {deploy_id}] key 文件同步成功")
            except Exception as e:
                raise RuntimeError(f"key 文件同步失败: {str(e)}")
        else:
            logger.info(f"[部署 {deploy_id}] 未配置 key 文件或路径不存在, 跳过")

        # 4. 渲染 YAML
        set_deploy_progress(deploy_id, "render_yaml", "正在生成部署配置...", 80)
        logger.info(f"[部署 {deploy_id}] 步骤4: 渲染 deploy_chat.yaml")
        yaml_content = render_deploy_yaml(
            image=image,
            gpus=gpus,
            model_path=remote_model_path,
            port=port,
            tp_size=tp_size,
            consul_host=consul_host,
            consul_token=consul_token,
            service_name=service_name,
            key_path=f"{remote_key_dir}" if model.key_path else "",
        )

        # 5. 上传 YAML
        set_deploy_progress(deploy_id, "upload_yaml", "正在上传配置文件...", 85)
        logger.info(f"[部署 {deploy_id}] 步骤5: 上传 YAML 到远程服务器")
        ssh.upload_content(yaml_content, REMOTE_YAML_PATH)

        # 6. 执行 das-start
        set_deploy_progress(deploy_id, "start_service", "正在启动服务...", 90)
        logger.info(f"[部署 {deploy_id}] 步骤6: 执行 das-start")
        exit_code, output, error = ssh.exec_command(
            f"das-start start {REMOTE_YAML_PATH}", timeout=300
        )
        if exit_code != 0:
            set_deploy_progress(deploy_id, "failed", f"das-start 执行失败: {error}", 100, "failed")
            update_deployment_status(db, deploy_id, "failed", yaml_content)
            raise RuntimeError(f"das-start 执行失败: {error}")

        # 7. 更新状态
        set_deploy_progress(deploy_id, "done", "部署成功!", 100, "done")
        update_deployment_status(db, deploy_id, "running", yaml_content)
        logger.info(f"[部署 {deploy_id}] 部署成功")

    except Exception as e:
        set_deploy_progress(deploy_id, "failed", str(e), 100, "failed")
        logger.error(f"[部署 {deploy_id}] 部署失败: {str(e)}")
        update_deployment_status(db, deploy_id, "failed")
        raise
    finally:
        if ssh:
            ssh.close()


def run_deployment_async(
    deploy_id: int,
    server_id: int,
    model_id: int,
    image: str,
    port: int,
    gpus: str,
    consul_host: str,
    consul_token: str,
    service_name: str,
):
    """异步执行部署 (在后台线程中运行)"""
    # Initialize progress
    set_deploy_progress(deploy_id, "initializing", "正在初始化部署...", 0)

    def _run():
        # Create a new DB session for the background thread
        from database.models import SessionLocal
        from api.server import get_server
        from api.model import get_model
        db_thread = SessionLocal()
        try:
            server = get_server(db_thread, server_id)
            model = get_model(db_thread, model_id)
            if not server:
                set_deploy_progress(deploy_id, "failed", "服务器不存在", 100, "failed")
                return
            if not model:
                set_deploy_progress(deploy_id, "failed", "模型不存在", 100, "failed")
                return

            _run_deployment_impl(
                db=db_thread,
                deploy_id=deploy_id,
                server=server,
                model=model,
                image=image,
                port=port,
                gpus=gpus,
                consul_host=consul_host,
                consul_token=consul_token,
                service_name=service_name,
            )
        except Exception as e:
            set_deploy_progress(deploy_id, "failed", str(e), 100, "failed")
        finally:
            db_thread.close()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


def run_deployment(
    db: Session,
    deploy_id: int,
    server,
    model,
    image: str,
    port: int,
    gpus: str,
    consul_host: str,
    consul_token: str,
    service_name: str,
):
    """同步执行部署 (兼容旧调用方式, 会报告进度)"""
    set_deploy_progress(deploy_id, "initializing", "正在初始化部署...", 0)
    return _run_deployment_impl(
        db=db,
        deploy_id=deploy_id,
        server=server,
        model=model,
        image=image,
        port=port,
        gpus=gpus,
        consul_host=consul_host,
        consul_token=consul_token,
        service_name=service_name,
    )
