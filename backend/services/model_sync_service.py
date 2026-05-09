import logging
import subprocess
from services.ssh_service import SSHService

logger = logging.getLogger(__name__)

REMOTE_MODEL_DIR = "/opt/models"


def check_model_exists(ssh: SSHService, model_name: str) -> bool:
    """检查目标机器上模型是否存在"""
    remote_path = f"{REMOTE_MODEL_DIR}/{model_name}"
    return ssh.file_exists(remote_path)


def sync_model(model_path: str, server_ip: str, ssh_user: str, model_name: str):
    """
    使用 rsync 同步模型到目标服务器
    从中央目录 /storage/models/ 同步到目标 /opt/models/
    """
    remote_path = f"{ssh_user}@{server_ip}:{REMOTE_MODEL_DIR}/"

    cmd = f"rsync -avz {model_path}/ {remote_path}{model_name}/"
    logger.info(f"开始 rsync: {model_path} -> {remote_path}{model_name}")

    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=3600)

    if result.returncode != 0:
        logger.error(f"rsync 失败: {result.stderr}")
        raise RuntimeError(f"模型同步失败: {result.stderr}")

    logger.info(f"模型同步成功: {model_name}")
    return True
