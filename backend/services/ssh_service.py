import paramiko
import logging
import os

logger = logging.getLogger(__name__)


class SSHService:
    def __init__(self, host, username, key_path=None, key_content=None, port=22):
        self.host = host
        self.username = username
        self.port = port
        self.client = None
        self._connect(key_path, key_content)

    def _connect(self, key_path=None, key_content=None, password=None):
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            if password:
                self.client.connect(
                    hostname=self.host,
                    username=self.username,
                    password=password,
                    port=self.port,
                    timeout=10,
                )
            elif key_content:
                key_file = None
                for key_class in (
                    paramiko.RSAKey,
                    paramiko.DSSKey,
                    paramiko.ECDSAKey,
                    paramiko.Ed25519Key,
                ):
                    try:
                        from io import StringIO
                        key_file = key_class.from_private_key(StringIO(key_content))
                        break
                    except paramiko.SSHException:
                        continue
                if key_file is None:
                    raise ValueError("无法解析 SSH Key 内容")
                self.client.connect(
                    hostname=self.host,
                    username=self.username,
                    pkey=key_file,
                    port=self.port,
                    timeout=10,
                )
            elif key_path:
                self.client.connect(
                    hostname=self.host,
                    username=self.username,
                    key_filename=key_path,
                    port=self.port,
                    timeout=10,
                )
            else:
                self.client.connect(
                    hostname=self.host,
                    username=self.username,
                    port=self.port,
                    timeout=10,
                )
            logger.info(f"SSH 连接成功: {self.username}@{self.host}")
        except Exception as e:
            logger.error(f"SSH 连接失败: {self.host} - {str(e)}")
            raise

    def exec_command(self, command, timeout=120):
        try:
            stdin, stdout, stderr = self.client.exec_command(command, timeout=timeout)
            exit_code = stdout.channel.recv_exit_status()
            output = stdout.read().decode("utf-8", errors="replace")
            error = stderr.read().decode("utf-8", errors="replace")
            return exit_code, output, error
        except Exception as e:
            logger.error(f"执行命令失败: {command} - {str(e)}")
            raise

    def exec_command_stream(self, command, timeout=120):
        """流式执行命令，返回生成器逐行输出"""
        try:
            stdin, stdout, stderr = self.client.exec_command(command, timeout=timeout)
            channel = stdout.channel
            channel.set_combine_stderr(True)

            for line in iter(lambda: stdout.readline(), ""):
                yield line.strip()

            exit_code = channel.recv_exit_status()
            if exit_code != 0:
                remaining = stderr.read().decode("utf-8", errors="replace")
                if remaining.strip():
                    yield f"[ERROR] {remaining.strip()}"
        except Exception as e:
            yield f"[ERROR] 执行命令失败: {str(e)}"

    def get_container_logs(self, service_name, tail=100):
        """获取容器日志"""
        try:
            stdin, stdout, stderr = self.client.exec_command(f"docker logs --tail {tail} {service_name}")
            exit_code = stdout.channel.recv_exit_status()
            output = stdout.read().decode("utf-8", errors="replace")
            error = stderr.read().decode("utf-8", errors="replace")
            return exit_code, output, error
        except Exception as e:
            return -1, "", str(e)

    def check_container_status(self, service_name):
        """检查容器运行状态"""
        try:
            stdin, stdout, stderr = self.client.exec_command(
                f"docker inspect {service_name} --format='{{{{.State.Status}}}}'"
            )
            exit_code = stdout.channel.recv_exit_status()
            status = stdout.read().decode("utf-8", errors="replace").strip().strip("'")
            return status
        except Exception:
            return "unknown"

    def get_gpu_processes(self):
        """通过 nvidia-smi 获取每个 GPU 上运行的进程信息
        
        Returns:
            list of dict: [
                {
                    "gpu_id": 0,
                    "pid": 12345,
                    "gpu_mem": "10240MiB",
                    "gpu_mem_mi": 10240,
                },
                ...
            ]
        """
        try:
            cmd = "nvidia-smi --query-compute-apps=gpu_uuid,gpu_bus_id,pid,used_gpu_memory --format=csv,noheader,nounits"
            exit_code, output, error = self.exec_command(cmd)
            if exit_code != 0:
                logger.debug(f"nvidia-smi 获取进程失败: {error}")
                return []

            # Also get GPU index mapping
            cmd_index = "nvidia-smi --query-gpu=index,uuid --format=csv,noheader"
            _, output_index, _ = self.exec_command(cmd_index)
            uuid_to_index = {}
            for line in output_index.strip().split("\n"):
                line = line.strip()
                if not line:
                    continue
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 2:
                    uuid_to_index[parts[1]] = int(parts[0])

            processes = []
            for line in output.strip().split("\n"):
                line = line.strip()
                if not line:
                    continue
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 4:
                    gpu_uuid = parts[0]
                    pid = int(parts[2])
                    used_mem = int(float(parts[3]))  # MiB

                    gpu_id = uuid_to_index.get(gpu_uuid, 0)
                    processes.append({
                        "gpu_id": gpu_id,
                        "pid": pid,
                        "gpu_mem_mi": used_mem,
                    })
            return processes
        except Exception as e:
            logger.error(f"获取 GPU 进程失败: {str(e)}")
            return []

    def get_pid_container_info(self, pid):
        """通过 PID 查找所属的容器信息

        Returns:
            dict: {
                "name": str - 容器名,
                "container_id": str - 容器 ID,
                "runtime": str - "docker" or "containerd",
            }
            或 None 如果未找到
        """
        try:
            # Method 1: Check cgroup (supports multiple cgroup formats)
            cmd = f"cat /proc/{pid}/cgroup 2>/dev/null | head -5"
            exit_code, output, _ = self.exec_command(cmd, timeout=10)
            if exit_code == 0 and output.strip():
                cgroup = output.strip()

                # Docker cgroupfs format: ...:/docker/<container_id>
                if "/docker/" in cgroup:
                    container_id = cgroup.split("/docker/")[-1].strip()
                    return self._resolve_docker_container(container_id[:64])

                # Docker systemd cgroup driver: ...:/system.slice/docker-<container_id>.scope
                import re
                docker_scope_match = re.search(r'docker-([0-9a-f]{64})\.scope', cgroup)
                if docker_scope_match:
                    return self._resolve_docker_container(docker_scope_match.group(1))

                # K8s containerd cgroup format: .../cri-containerd-<container_id>.scope
                if "cri-containerd-" in cgroup:
                    for line in cgroup.split("\n"):
                        if "cri-containerd-" in line:
                            parts = line.split("cri-containerd-")
                            if len(parts) > 1:
                                container_id = parts[1].split(".")[0]
                                k8s_name = self._inspect_k8s_container_name(container_id)
                                if k8s_name:
                                    return {
                                        "name": k8s_name,
                                        "container_id": container_id[:12],
                                        "runtime": "containerd",
                                    }
                                break

                # Containerd non-K8s format: .../cri-containerd.containerd.sock/<container_id>
                containerd_match = re.search(r'containerd[^\n]*[/]([0-9a-f]{64})', cgroup)
                if containerd_match:
                    container_id = containerd_match.group(1)
                    k8s_name = self._inspect_k8s_container_name(container_id)
                    if k8s_name:
                        return {
                            "name": k8s_name,
                            "container_id": container_id[:12],
                            "runtime": "containerd",
                        }

            # Method 2: Use docker ps --format to find PID via /proc
            cmd_ps = (
                f"docker ps -q | while read cid; do "
                f"  docker top $cid -eo pid 2>/dev/null | grep -q '^{pid}$' && echo $cid; "
                f"done"
            )
            _, ps_output, _ = self.exec_command(cmd_ps, timeout=30)
            if ps_output.strip():
                for line in reversed(ps_output.strip().split("\n")):
                    cid = line.strip()
                    if len(cid) == 12 and all(c in '0123456789abcdef' for c in cid):
                        cmd_name = f"docker inspect --format='{{{{.Name}}}}' {cid}"
                        _, name_output, _ = self.exec_command(cmd_name, timeout=10)
                        name = name_output.strip().lstrip("/")
                        if name:
                            return {
                                "name": name,
                                "container_id": cid[:12],
                                "runtime": "docker",
                            }
                        break

            # Method 3: Use nsenter to check PID's mount namespace and match with container
            cmd_ns = f"ls -l /proc/{pid}/ns/mnt 2>/dev/null"
            _, ns_output, _ = self.exec_command(cmd_ns, timeout=10)
            if ns_output.strip():
                # Extract the mount namespace inode number
                ns_match = re.search(r'\[(\d+)\]', ns_output)
                if ns_match:
                    target_inode = ns_match.group(1)
                    # Compare with all running containers' mount namespace inodes
                    cmd_find = (
                        f"docker ps -q | while read cid; do "
                        f"  pid=$(docker inspect --format='{{{{.State.Pid}}}}' $cid 2>/dev/null); "
                        f"  if [ -n \"$pid\" ] && [ \"$pid\" != \"0\" ]; then "
                        f"    inode=$(ls -l /proc/$pid/ns/mnt 2>/dev/null | grep -o '\\[[0-9]*\\]' | tr -d '[]'); "
                        f"    if [ \"$inode\" = \"{target_inode}\" ]; then echo $cid; fi; "
                        f"  fi; "
                        f"done"
                    )
                    _, found_output, _ = self.exec_command(cmd_find, timeout=30)
                    if found_output.strip():
                        cid = found_output.strip().split("\n")[-1].strip()
                        if cid:
                            cmd_name = f"docker inspect --format='{{{{.Name}}}}' {cid}"
                            _, name_output, _ = self.exec_command(cmd_name, timeout=10)
                            name = name_output.strip().lstrip("/")
                            if name:
                                return {
                                    "name": name,
                                    "container_id": cid[:12],
                                    "runtime": "docker",
                                }

            return None
        except Exception:
            return None

    def _resolve_docker_container(self, container_id):
        """通过 container_id 获取容器名"""
        try:
            cmd_name = f"docker inspect --format='{{{{.Name}}}}' {container_id[:12]}"
            _, name_output, _ = self.exec_command(cmd_name, timeout=10)
            name = name_output.strip().lstrip("/")
            if name:
                return {
                    "name": name,
                    "container_id": container_id[:12],
                    "runtime": "docker",
                }
        except Exception:
            pass
        return None

    def _inspect_k8s_container_name(self, container_id):
        """通过 crictl inspect 获取 K8s 容器名"""
        try:
            self.exec_command(
                "echo 'import json,sys;d=json.load(sys.stdin);print(d.get(\"status\",{}).get(\"metadata\",{}).get(\"name\",\"\"))' > /tmp/_k8s.py",
                timeout=5,
            )
            cmd = f"crictl inspect {container_id} 2>/dev/null | python3 /tmp/_k8s.py 2>/dev/null"
            _, crictl_out, _ = self.exec_command(cmd, timeout=15)
            return crictl_out.strip() or None
        except Exception:
            return None

    def get_pid_container(self, pid):
        """通过 PID 查找所属的容器名称 (兼容旧接口)"""
        info = self.get_pid_container_info(pid)
        return info["name"] if info else None

    def inspect_k8s_container(self, container_id):
        """检查 K8s containerd 容器的配置信息
        
        Args:
            container_id: containerd container ID (12 chars)
        
        Returns:
            dict with name, image, env, model_path, port, gpus, running, status
            or None if not found
        """
        try:
            container_name = self._inspect_k8s_container_name(container_id)
            if not container_name:
                return None

            # Get env vars via crictl exec
            _, env_out, _ = self.exec_command(
                f"crictl exec {container_id} env 2>/dev/null",
                timeout=15,
            )
            env_list = []
            env_dict = {}
            for line in env_out.strip().split("\n"):
                line = line.strip()
                if "=" in line:
                    k, v = line.split("=", 1)
                    env_list.append(line)
                    env_dict[k] = v

            # Extract PORT
            port = None
            for key in ["PORT", "port"]:
                if key in env_dict:
                    try:
                        port = int(env_dict[key])
                        break
                    except (ValueError, TypeError):
                        pass

            # Extract MODEL path
            model_path = env_dict.get("MODEL", "") or env_dict.get("model_path", "")

            # Extract GPU info from CUDA_VISIBLE_DEVICES
            gpus = []
            cuda = env_dict.get("CUDA_VISIBLE_DEVICES", "")
            if cuda:
                gpus = [x.strip() for x in cuda.split(",") if x.strip()]
            
            # Get GPU count from TENSOR_PARALLEL_SIZE as fallback
            tp = env_dict.get("TENSOR_PARALLEL_SIZE", "")
            if not gpus and tp:
                try:
                    tp_int = int(tp)
                    gpus = list(range(tp_int))
                except (ValueError, TypeError):
                    pass

            # Get image
            self.exec_command(
                "echo 'import json,sys;d=json.load(sys.stdin);print(d.get(\"status\",{}).get(\"image\",{}).get(\"image\",\"\"))' > /tmp/_k8s2.py",
                timeout=5,
            )
            _, img_out, _ = self.exec_command(
                f"crictl inspect {container_id} 2>/dev/null | python3 /tmp/_k8s2.py 2>/dev/null",
                timeout=15,
            )
            image = img_out.strip() or "unknown"

            return {
                "name": container_name,
                "image": image,
                "env": env_list,
                "model_path": model_path,
                "port": port,
                "gpus": gpus,
                "running": True,
                "status": "running",
                "mounts": [],
                "command": [],
            }
        except Exception as e:
            logger.error(f"检查 K8s 容器失败: {str(e)}")
            return None

    def read_remote_file(self, remote_path):
        """读取远程文件内容"""
        try:
            cmd = f"cat {remote_path}"
            exit_code, output, error = self.exec_command(cmd, timeout=30)
            if exit_code == 0:
                return output
            return None
        except Exception:
            return None

    def list_containers(self):
        """获取所有运行中的容器列表 (docker ps)"""
        try:
            cmd = "docker ps --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'"
            exit_code, output, error = self.exec_command(cmd)
            if exit_code != 0:
                logger.error(f"docker ps 执行失败: {error}")
                return []

            containers = []
            for line in output.strip().split("\n"):
                line = line.strip()
                if not line:
                    continue
                parts = line.split("|", 4)
                if len(parts) >= 4:
                    containers.append({
                        "id": parts[0],
                        "name": parts[1],
                        "image": parts[2],
                        "status": parts[3],
                        "ports": parts[4] if len(parts) > 4 else "",
                    })
            return containers
        except Exception as e:
            logger.error(f"列出容器失败: {str(e)}")
            return []

    def inspect_container(self, container_name):
        """获取容器完整配置信息 (docker inspect)"""
        try:
            cmd = f"docker inspect {container_name}"
            exit_code, output, error = self.exec_command(cmd)
            if exit_code != 0:
                logger.error(f"docker inspect 执行失败: {error}")
                return None

            import json
            data = json.loads(output)
            if not data:
                return None

            c = data[0]
            config = c.get("Config", {})
            host_config = c.get("HostConfig", {})
            state = c.get("State", {})
            mounts = c.get("Mounts", [])

            # Extract GPU information
            gpus = []
            env_vars = config.get("Env", [])
            env_dict = {}
            for e in env_vars:
                if "=" in e:
                    k, v = e.split("=", 1)
                    env_dict[k] = v

            device_requests = host_config.get("DeviceRequests", [])
            if device_requests:
                for req in device_requests:
                    capabilities = req.get("Capabilities", [])
                    for cap_group in capabilities:
                        for cap in cap_group:
                            if cap == "gpu" or cap == "nvidia":
                                gpus = req.get("DeviceIDs", [])
                                break

            # Fallback: check CUDA_VISIBLE_DEVICES or NVIDIA_VISIBLE_DEVICES
            if not gpus:
                cuda_val = env_dict.get("CUDA_VISIBLE_DEVICES", "")
                nvidia_val = env_dict.get("NVIDIA_VISIBLE_DEVICES", "")
                visible = cuda_val or nvidia_val
                if visible and visible != "all":
                    gpus = [x.strip() for x in visible.split(",") if x.strip()]

            # Extract port information
            port = None
            port_bindings = host_config.get("PortBindings", {})
            if port_bindings:
                for host_port_info in port_bindings.values():
                    if host_port_info and len(host_port_info) > 0:
                        port = int(host_port_info[0].get("HostPort", "0"))
                        if port:
                            break
            # Fallback: extract PORT from environment variables
            if port is None:
                env_vars = config.get("Env", [])
                for env in env_vars:
                    if env.startswith("PORT="):
                        port = int(env.split("=", 1)[1])
                        break

            # Extract model path from mounts (both /opt/models/ and /workspace/)
            # Containers may have multiple mounts; skip auxiliary ones like logs/cache/tmp
            skip_dest_patterns = {"logs", "tmp", "cache", "cache_fsm", "config", "data"}
            model_path = None
            model_name_from_host = None
            for mount in mounts:
                dest = mount.get("Destination", "")
                source = mount.get("Source", "")
                if "/opt/models/" in dest or "/workspace/" in dest:
                    if not source:
                        continue
                    # Skip auxiliary mounts (logs, cache, tmp, etc.)
                    dest_base = dest.rstrip("/").split("/")[-1].lower()
                    if dest_base in skip_dest_patterns:
                        continue
                    model_path = source
                    model_name_from_host = source.rstrip("/").split("/")[-1]
                    break

            return {
                "name": c.get("Name", "").lstrip("/"),
                "id": c.get("Id", "")[:12],
                "image": config.get("Image", ""),
                "status": state.get("Status", "unknown"),
                "running": state.get("Running", False),
                "created_at": c.get("Created", ""),
                "gpus": gpus,
                "port": port,
                "env": config.get("Env", []),
                "mounts": mounts,
                "command": config.get("Cmd", []),
                "model_path": model_path,
                "model_name_from_host": model_name_from_host,
            }
        except Exception as e:
            logger.error(f"检查容器配置失败: {str(e)}")
            return None

    def upload_file(self, local_path, remote_path):
        try:
            sftp = self.client.open_sftp()
            remote_dir = os.path.dirname(remote_path)
            if remote_dir:
                try:
                    sftp.stat(remote_dir)
                except FileNotFoundError:
                    self.mkdir(remote_dir)
            sftp.put(local_path, remote_path)
            sftp.close()
            logger.info(f"文件上传成功: {local_path} -> {remote_path}")
        except Exception as e:
            logger.error(f"文件上传失败: {local_path} -> {remote_path} - {str(e)}")
            raise

    def upload_content(self, content, remote_path):
        try:
            sftp = self.client.open_sftp()
            remote_dir = os.path.dirname(remote_path)
            if remote_dir:
                try:
                    sftp.stat(remote_dir)
                except FileNotFoundError:
                    self.mkdir(remote_dir)
            with sftp.open(remote_path, "w") as f:
                f.write(content)
            sftp.close()
            logger.info(f"内容上传成功: {remote_path}")
        except Exception as e:
            logger.error(f"内容上传失败: {remote_path} - {str(e)}")
            raise

    def file_exists(self, remote_path):
        try:
            sftp = self.client.open_sftp()
            sftp.stat(remote_path)
            sftp.close()
            return True
        except FileNotFoundError:
            return False
        except Exception as e:
            logger.error(f"检查文件失败: {remote_path} - {str(e)}")
            return False

    def mkdir(self, remote_path):
        try:
            sftp = self.client.open_sftp()
            parts = remote_path.split("/")
            current = ""
            for part in parts:
                if not part:
                    continue
                current += f"/{part}"
                try:
                    sftp.stat(current)
                except FileNotFoundError:
                    sftp.mkdir(current)
            sftp.close()
            logger.info(f"目录创建成功: {remote_path}")
        except Exception as e:
            logger.error(f"目录创建失败: {remote_path} - {str(e)}")
            raise

    def close(self):
        if self.client:
            self.client.close()
            logger.info(f"SSH 连接关闭: {self.host}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
