from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database.models import init_db, SessionLocal
from api.server import (
    ServerCreate,
    ServerUpdate,
    ServerResponse,
    AutoSetupRequest,
    get_servers,
    get_server,
    create_server,
    update_server,
    delete_server,
    auto_setup_server,
)
from api.model import (
    ModelCreate,
    ModelUpdate,
    ModelResponse,
    get_models,
    get_model,
    create_model,
    update_model,
    delete_model,
)
from api.deploy import (
    DeployCreate,
    DeployResponse,
    get_deployments,
    get_deployment,
    create_deployment,
    delete_deployment,
)
from api.image import (
    ImageVersionCreate,
    ImageVersionUpdate,
    ImageVersionResponse,
    get_image_versions,
    get_image_version,
    create_image_version,
    update_image_version,
    delete_image_version,
)
from services.deploy_service import run_deployment, run_deployment_async, get_deploy_progress, clear_deploy_progress
from services.gpu_service import get_gpu_status
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GPU Model Deploy Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    from services.scan_scheduler import ScanScheduler
    scheduler = ScanScheduler(app, interval=3600)
    scheduler.start()
    logger.info("定时容器扫描调度器已启动 (每小时)")


# ====== Database ======
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====== Server API ======
@app.get("/api/servers")
def list_servers(db: Session = Depends(get_db)):
    servers = get_servers(db)
    return servers


@app.get("/api/servers/{server_id}")
def get_server_detail(server_id: int, db: Session = Depends(get_db)):
    server = get_server(db, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    return server


@app.post("/api/servers")
def add_server(data: ServerCreate, db: Session = Depends(get_db)):
    server = create_server(db, data)
    return server


@app.put("/api/servers/{server_id}")
def edit_server(server_id: int, data: ServerUpdate, db: Session = Depends(get_db)):
    server = update_server(db, server_id, data)
    if not server:
        raise HTTPException(404, "Server not found")
    return server


@app.delete("/api/servers/{server_id}")
def remove_server(server_id: int, db: Session = Depends(get_db)):
    if not delete_server(db, server_id):
        raise HTTPException(404, "Server not found")
    return {"status": "deleted"}


@app.get("/api/servers/{server_id}/gpu-status")
def server_gpu_status(server_id: int, db: Session = Depends(get_db)):
    server = get_server(db, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    try:
        gpu_status = get_gpu_status(server)
        return {"gpus": gpu_status}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/servers/{server_id}/auto-setup")
def server_auto_setup(server_id: int, data: AutoSetupRequest, db: Session = Depends(get_db)):
    try:
        result = auto_setup_server(db, server_id, data.ssh_password, data.ssh_port)
        return result
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"自动配置失败: {str(e)}")


@app.post("/api/servers/{server_id}/health-check")
def server_health_check(server_id: int, db: Session = Depends(get_db)):
    server = get_server(db, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    try:
        from services.ssh_service import SSHService
        ssh = SSHService(
            host=server.ip,
            username=server.ssh_user,
            key_content=server.ssh_key,
        )
        exit_code, output, error = ssh.exec_command("echo ok", timeout=10)
        ssh.close()
        if exit_code == 0:
            server.status = "online"
            db.commit()
            db.refresh(server)
            return {"status": "online", "message": "服务器连接成功"}
        else:
            server.status = "offline"
            db.commit()
            return {"status": "offline", "message": f"连接异常: {error}"}
    except Exception as e:
        server.status = "offline"
        db.commit()
        raise HTTPException(500, f"健康检查失败: {str(e)}")


@app.post("/api/servers/{server_id}/detect-gpu")
def server_detect_gpu(server_id: int, db: Session = Depends(get_db)):
    server = get_server(db, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    try:
        gpu_status = get_gpu_status(server)
        total_count = len(gpu_status)
        available_count = sum(1 for g in gpu_status if g["free"])
        server.gpu_count = total_count
        server.gpu_available = available_count
        db.commit()
        db.refresh(server)
        return {
            "total": total_count,
            "available": available_count,
            "gpus": gpu_status,
        }
    except Exception as e:
        raise HTTPException(500, f"GPU 检测失败: {str(e)}")


# ====== Model API ======
@app.get("/api/models")
def list_models(db: Session = Depends(get_db)):
    return get_models(db)


@app.post("/api/models")
def add_model(data: ModelCreate, db: Session = Depends(get_db)):
    return create_model(db, data)


@app.put("/api/models/{model_id}")
def edit_model(model_id: int, data: ModelUpdate, db: Session = Depends(get_db)):
    model = update_model(db, model_id, data)
    if not model:
        raise HTTPException(404, "Model not found")
    return model


@app.delete("/api/models/{model_id}")
def remove_model(model_id: int, db: Session = Depends(get_db)):
    if not delete_model(db, model_id):
        raise HTTPException(404, "Model not found")
    return {"status": "deleted"}


# ====== Deploy API ======
@app.get("/api/deployments")
def list_deployments(db: Session = Depends(get_db)):
    return get_deployments(db)


@app.post("/api/deployments")
def create_deploy(data: DeployCreate, db: Session = Depends(get_db)):
    server = get_server(db, data.server_id)
    if not server:
        raise HTTPException(404, "Server not found")

    model = get_model(db, data.model_id)
    if not model:
        raise HTTPException(404, "Model not found")

    try:
        deployment = create_deployment(db, data)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Start deployment in background thread (pass IDs, not ORM objects)
    run_deployment_async(
        deploy_id=deployment.id,
        server_id=data.server_id,
        model_id=data.model_id,
        image=data.image,
        port=data.port,
        gpus=data.gpus,
        consul_host="consul.internal",
        consul_token="auto-generated-token",
        service_name=data.service_name,
    )

    return deployment


@app.delete("/api/deployments/{deploy_id}")
def delete_deploy(deploy_id: int, db: Session = Depends(get_db)):
    from api.deploy import get_deployment
    from api.server import get_server
    from services.ssh_service import SSHService

    deploy = get_deployment(db, deploy_id)
    if not deploy:
        raise HTTPException(404, "Deployment not found")

    server = get_server(db, deploy.server_id)
    if server:
        try:
            ssh = SSHService(
                host=server.ip,
                username=server.ssh_user,
                key_content=server.ssh_key,
            )
            service_name = deploy.service_name
            exit_code, output, error = ssh.exec_command(f"docker rm -f {service_name}")
            ssh.close()
            logger.info(f"容器删除: {service_name} on {server.ip}, exit_code={exit_code}")
        except Exception as e:
            logger.warning(f"删除容器失败 {deploy_id}: {str(e)}")

    if not delete_deployment(db, deploy_id):
        raise HTTPException(404, "Deployment not found")
    return {"status": "deleted"}


@app.get("/api/deployments/{deploy_id}/yaml")
def get_deploy_yaml(deploy_id: int, db: Session = Depends(get_db)):
    deploy = get_deployment(db, deploy_id)
    if not deploy:
        raise HTTPException(404, "Deployment not found")
    return {"yaml": deploy.yaml_content}


@app.post("/api/deployments/scan")
def scan_deployments(db: Session = Depends(get_db)):
    """手动触发全量容器扫描"""
    from services.container_scan_service import scan_server_containers
    servers = get_servers(db)
    result = {"scanned": 0, "added": 0, "synced": 0, "skipped": 0, "removed": 0, "errors": []}
    for server in servers:
        try:
            r = scan_server_containers(db, server)
            for k in ["scanned", "added", "synced", "skipped", "removed"]:
                result[k] += r.get(k, 0)
            if "errors" in r:
                result["errors"].extend(r["errors"])
        except Exception as e:
            result["errors"].append(f"{server.name}: {e}")
            logger.error(f"扫描服务器 {server.name} 时出错: {e}")
    return result


@app.post("/api/deployments/scan/{server_id}")
def scan_single_server(server_id: int, db: Session = Depends(get_db)):
    """手动触发单台服务器的容器扫描"""
    from services.container_scan_service import scan_server_containers
    from api.server import get_server
    server = get_server(db, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    result = scan_server_containers(db, server)
    return result


# ====== Image Version API ======
@app.get("/api/images")
def list_images(db: Session = Depends(get_db)):
    return get_image_versions(db)


@app.post("/api/images")
def add_image(data: ImageVersionCreate, db: Session = Depends(get_db)):
    return create_image_version(db, data)


@app.put("/api/images/{image_id}")
def edit_image(image_id: int, data: ImageVersionUpdate, db: Session = Depends(get_db)):
    image = update_image_version(db, image_id, data)
    if not image:
        raise HTTPException(404, "Image version not found")
    return image


@app.delete("/api/images/{image_id}")
def remove_image(image_id: int, db: Session = Depends(get_db)):
    if not delete_image_version(db, image_id):
        raise HTTPException(404, "Image version not found")
    return {"status": "deleted"}


# ====== Deploy Log Streaming API ======
def generate_deploy_log(deploy_id: int, db_gen: Session):
    from api.deploy import get_deployment
    from api.server import get_server
    from services.ssh_service import SSHService

    deploy = get_deployment(db_gen, deploy_id)
    if not deploy:
        yield "data: [ERROR] 部署不存在\n\n"
        return

    server = get_server(db_gen, deploy.server_id)
    if not server:
        yield "data: [ERROR] 服务器不存在\n\n"
        return

    try:
        ssh = SSHService(
            host=server.ip,
            username=server.ssh_user,
            key_content=server.ssh_key,
        )
        service_name = deploy.service_name

        # 先检查容器状态
        status = ssh.check_container_status(service_name)
        yield f"data: [STATUS] 容器状态: {status}\n\n"

        # 流式获取容器日志
        for line in ssh.exec_command_stream(f"docker logs --follow --tail 10 {service_name}", timeout=600):
            yield f"data: {line}\n\n"
            if "Error" in line or "error" in line or "Exception" in line or "failed" in line.lower():
                yield f"data: [ALERT] {line}\n\n"

        ssh.close()
    except Exception as e:
        yield f"data: [ERROR] {str(e)}\n\n"


@app.get("/api/deployments/{deploy_id}/logs")
def stream_deploy_logs(deploy_id: int, db: Session = Depends(get_db)):
    return StreamingResponse(
        generate_deploy_log(deploy_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ====== Deploy Progress API ======
@app.get("/api/deployments/{deploy_id}/progress")
def get_deployment_progress(deploy_id: int):
    """获取部署进度 (JSON, 用于前端轮询)"""
    progress = get_deploy_progress(deploy_id)
    if progress:
        return progress
    # Fallback: check deployment status from DB
    db = SessionLocal()
    try:
        deploy = get_deployment(db, deploy_id)
        if deploy and deploy.status == "running":
            return {"step": "done", "message": "部署完成", "percent": 100, "status": "done"}
    finally:
        db.close()
    return {"step": "none", "message": "", "percent": 0, "status": "pending"}


def generate_progress_stream(deploy_id: int):
    """SSE 生成器: 持续推送部署进度"""
    timeout_count = 0
    max_timeout = 600  # 10 minutes max

    while timeout_count < max_timeout:
        progress = get_deploy_progress(deploy_id)
        if progress:
            yield f"data: {json.dumps(progress)}\n\n"
            if progress["status"] in ("done", "failed"):
                # Clear progress after final state
                clear_deploy_progress(deploy_id)
                break
        time.sleep(1)
        timeout_count += 1


@app.get("/api/deployments/{deploy_id}/progress/stream")
def stream_deploy_progress(deploy_id: int):
    """SSE 部署进度流"""
    return StreamingResponse(
        generate_progress_stream(deploy_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
