from sqlalchemy.orm import Session
from database.models import Server, Model, Deployment


def get_platform_stats(db: Session):
    servers = db.query(Server).all()
    models = db.query(Model).all()
    deployments = db.query(Deployment).all()

    running = len([d for d in deployments if d.status == "running"])
    failed = len([d for d in deployments if d.status == "failed"])

    return {
        "server_count": len(servers),
        "model_count": len(models),
        "deployment_count": len(deployments),
        "running_count": running,
        "failed_count": failed,
    }
