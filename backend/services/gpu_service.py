import logging
from services.ssh_service import SSHService

logger = logging.getLogger(__name__)


def get_gpu_status(server):
    """
    获取服务器 GPU 状态
    返回: [{"gpu": 0, "used": 72, "total": 80, "free": false}, ...]
    """
    ssh = None
    try:
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

        gpu_list = []
        for line in output.strip().split("\n"):
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 3:
                gpu_id = int(parts[0])
                used = int(parts[1].replace(" MiB", ""))
                total = int(parts[2].replace(" MiB", ""))
                gpu_list.append(
                    {
                        "gpu": gpu_id,
                        "used": used,
                        "total": total,
                        "free": used <= 100,
                    }
                )
        return gpu_list
    except Exception as e:
        logger.error(f"获取 GPU 状态失败: {server.ip} - {str(e)}")
        raise
    finally:
        if ssh:
            ssh.close()
