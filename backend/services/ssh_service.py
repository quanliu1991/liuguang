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
