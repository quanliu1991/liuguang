import logging
import os
import subprocess
import tarfile
import tempfile
from services.ssh_service import SSHService
from services.yaml_service import render_deploy_yaml
from api.deploy import update_deployment_status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

REMOTE_MODEL_DIR = "/opt/models"
REMOTE_YAML_PATH = "/tmp/deploy_chat.yaml"
REMOTE_KEY_DIR = "/opt/keys"


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
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tar_path = tmp.name

    try:
        with tarfile.open(tar_path, "w:gz") as tar:
            tar.add(local_model_path, arcname=model_name)

        tar_size = os.path.getsize(tar_path)
        logger.info(f"[部署 {deploy_id}] 模型打包完成, 大小: {tar_size / 1024 / 1024:.1f} MB")

        remote_tar_path = f"/tmp/{model_name}.tar.gz"
        logger.info(f"[部署 {deploy_id}] 上传模型到远程: {remote_tar_path}")
        ssh.upload_file(tar_path, remote_tar_path)

        logger.info(f"[部署 {deploy_id}] 解压模型到 {remote_model_dir}")
        exit_code, output, error = ssh.exec_command(
            f"mkdir -p {remote_model_dir} && tar -xzf {remote_tar_path} -C {remote_model_dir} && rm {remote_tar_path}",
            timeout=1800,
        )
        if exit_code != 0:
            raise RuntimeError(f"模型解压失败: {error}")

        logger.info(f"[部署 {deploy_id}] 模型同步成功 (tar)")
    finally:
        if os.path.exists(tar_path):
            os.remove(tar_path)


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
    gpu_list = gpus.split(",")
    tp_size = len(gpu_list)
    ssh = None

    try:
        # 1. 校验 GPU 是否空闲
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
        logger.info(f"[部署 {deploy_id}] 步骤2: 校验 Port {port} 是否占用")
        exit_code, output, error = ssh.exec_command(f"ss -tlnp | grep :{port}")
        if exit_code == 0:
            raise RuntimeError(f"Port {port} 已被占用")

        # 3. 检查模型是否存在 / 同步
        logger.info(f"[部署 {deploy_id}] 步骤3: 检查/同步模型")
        remote_model_path = f"{REMOTE_MODEL_DIR}/{model.name}"
        remote_key_dir = f"{REMOTE_KEY_DIR}/{model.name}"
        exit_code, output, error = ssh.exec_command(f"test -d {remote_model_path} && echo 'yes' || echo 'no'")
        model_exists = "yes" in output

        if not model_exists:
            logger.info(f"[部署 {deploy_id}] 模型不存在, 开始同步")
            if not os.path.exists(model.path):
                raise RuntimeError(f"本地模型路径不存在: {model.path}")

            # 优先使用 rsync, 失败则回退到 tar + SFTP
            try:
                _sync_model_via_rsync(model.path, remote_model_path, server, deploy_id)
            except RuntimeError as e:
                if "rsync" in str(e).lower():
                    logger.warning(f"[部署 {deploy_id}] rsync 不可用, 切换到 tar 模式")
                    _sync_model_via_tar(ssh, model.path, REMOTE_MODEL_DIR, model.name, deploy_id)
                else:
                    raise
        else:
            logger.info(f"[部署 {deploy_id}] 模型已存在, 跳过同步")

        # 3.5 同步 key 文件到远程服务器
        if model.key_path and os.path.exists(model.key_path):
            logger.info(f"[部署 {deploy_id}] 步骤3.5: 同步 key 文件到远程")
            try:
                exit_code, output, error = ssh.exec_command(f"mkdir -p {remote_key_dir}")
                if exit_code != 0:
                    raise RuntimeError(f"创建 key 目录失败: {error}")

                if os.path.isfile(model.key_path):
                    ssh.upload_file(model.key_path, f"{remote_key_dir}")
                elif os.path.isdir(model.key_path):
                    import tarfile
                    import tempfile as tf
                    base_name = os.path.basename(model.key_path)
                    with tf.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
                        tar_path = tmp.name
                    try:
                        with tarfile.open(tar_path, "w:gz") as tar:
                            for item in os.listdir(model.key_path):
                                item_path = os.path.join(model.key_path, item)
                                tar.add(item_path, arcname=f"{base_name}/{item}")
                        remote_tar_path = f"/tmp/{model.name}_key.tar.gz"
                        ssh.upload_file(tar_path, remote_tar_path)
                        ssh.exec_command(f"tar -xzf {remote_tar_path} -C {remote_key_dir} && rm {remote_tar_path}")
                    finally:
                        if os.path.exists(tar_path):
                            os.remove(tar_path)

                logger.info(f"[部署 {deploy_id}] key 文件同步成功")
            except Exception as e:
                raise RuntimeError(f"key 文件同步失败: {str(e)}")
        else:
            logger.info(f"[部署 {deploy_id}] 未配置 key 文件或路径不存在, 跳过")

        # 4. 渲染 YAML
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
            key_path=f"{remote_key_dir}/keylist/key-5years" if model.key_path else "",
        )

        # 5. 上传 YAML
        logger.info(f"[部署 {deploy_id}] 步骤5: 上传 YAML 到远程服务器")
        ssh.upload_content(yaml_content, REMOTE_YAML_PATH)

        # 6. 执行 das-start
        logger.info(f"[部署 {deploy_id}] 步骤6: 执行 das-start")
        exit_code, output, error = ssh.exec_command(
            f"das-start start {REMOTE_YAML_PATH}", timeout=300
        )
        if exit_code != 0:
            update_deployment_status(db, deploy_id, "failed", yaml_content)
            raise RuntimeError(f"das-start 执行失败: {error}")

        # 7. 更新状态
        update_deployment_status(db, deploy_id, "running", yaml_content)
        logger.info(f"[部署 {deploy_id}] 部署成功")

        return {"status": "success", "yaml": yaml_content}

    except Exception as e:
        logger.error(f"[部署 {deploy_id}] 部署失败: {str(e)}")
        update_deployment_status(db, deploy_id, "failed")
        raise
    finally:
        if ssh:
            ssh.close()
