from sqlalchemy.orm import Session
from database.models import Server
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ServerCreate(BaseModel):
    name: str
    ip: str
    ssh_user: str
    ssh_password: Optional[str] = None
    ssh_port: int = 22
    ssh_key: Optional[str] = None
    gpu_count: int = 0


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    ip: Optional[str] = None
    ssh_user: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_key: Optional[str] = None
    gpu_count: Optional[int] = None


class ServerResponse(BaseModel):
    id: int
    name: str
    ip: str
    ssh_user: str
    ssh_port: int
    status: str
    gpu_count: int
    gpu_available: int
    created_at: datetime

    class Config:
        from_attributes = True


class AutoSetupRequest(BaseModel):
    ssh_password: str
    ssh_port: int = 22


def get_servers(db: Session):
    return db.query(Server).all()


def get_server(db: Session, server_id: int):
    return db.query(Server).filter(Server.id == server_id).first()


def create_server(db: Session, data: ServerCreate):
    server = Server(**data.model_dump())
    db.add(server)
    db.commit()
    db.refresh(server)
    return server


def update_server(db: Session, server_id: int, data: ServerUpdate):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(server, key, value)
    db.commit()
    db.refresh(server)
    return server


def delete_server(db: Session, server_id: int):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        return False
    db.delete(server)
    db.commit()
    return True


def auto_setup_server(db: Session, server_id: int, password: str, port: int = 22):
    """
    使用密码登录目标服务器，获取私钥并发送主服务器公钥
    1. 密码登录目标服务器
    2. 获取目标服务器的私钥 (cat ~/.ssh/id_ed25519 或 id_rsa)
    3. 获取主服务器的公钥
    4. 将主服务器公钥添加到目标服务器的 authorized_keys
    5. 返回目标服务器私钥内容
    """
    import paramiko
    import os

    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise ValueError("服务器不存在")

    # 1. 密码登录目标服务器
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=server.ip,
        username=server.ssh_user,
        password=password,
        port=port,
        timeout=10,
    )

    # 2. 获取目标服务器私钥
    private_key = None
    for key_file in ["~/.ssh/id_ed25519", "~/.ssh/id_rsa"]:
        stdin, stdout, stderr = client.exec_command(f"cat {key_file}")
        key_content = stdout.read().decode("utf-8").strip()
        if key_content and "PRIVATE KEY" in key_content:
            private_key = key_content
            break

    if not private_key:
        # 如果目标服务器没有密钥，生成一个
        client.exec_command("ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N '' -q")
        stdin, stdout, stderr = client.exec_command("cat ~/.ssh/id_ed25519")
        private_key = stdout.read().decode("utf-8").strip()

    # 3. 获取主服务器的公钥
    main_public_key = None
    for key_file in ["~/.ssh/id_ed25519.pub", "~/.ssh/id_rsa.pub"]:
        if os.path.exists(os.path.expanduser(key_file)):
            with open(os.path.expanduser(key_file), "r") as f:
                main_public_key = f.read().strip()
            break

    if main_public_key:
        # 4. 将主服务器公钥添加到目标服务器
        client.exec_command(f"mkdir -p ~/.ssh && chmod 700 ~/.ssh")
        stdin, stdout, stderr = client.exec_command(f"grep -qF '{main_public_key}' ~/.ssh/authorized_keys || echo '{main_public_key}' >> ~/.ssh/authorized_keys")
        client.exec_command("chmod 600 ~/.ssh/authorized_keys")

    client.close()

    # 5. 更新服务器信息
    server.ssh_key = private_key
    server.ssh_password = None  # 不保存密码
    server.ssh_port = port
    db.commit()
    db.refresh(server)

    return {
        "status": "success",
        "message": "服务器自动配置完成",
        "gpu_count": _detect_gpu_count(server, private_key),
    }


def _detect_gpu_count(server, private_key):
    """检测 GPU 数量"""
    from services.ssh_service import SSHService
    try:
        ssh = SSHService(
            host=server.ip,
            username=server.ssh_user,
            key_content=private_key,
            port=server.ssh_port,
        )
        exit_code, output, error = ssh.exec_command("nvidia-smi -L | wc -l")
        ssh.close()
        if exit_code == 0:
            return int(output.strip())
    except Exception:
        pass
    return 0
