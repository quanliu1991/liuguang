from sqlalchemy.orm import Session
from database.models import Deployment
from pydantic import BaseModel
from datetime import datetime


class DeployCreate(BaseModel):
    service_name: str
    server_id: int
    model_id: int
    image: str
    port: int
    gpus: str


class DeployResponse(BaseModel):
    id: int
    service_name: str
    server_id: int
    model_id: int
    image: str
    port: int
    gpus: str
    status: str
    yaml_content: str
    created_at: datetime

    class Config:
        from_attributes = True


def get_deployments(db: Session):
    return db.query(Deployment).all()


def get_deployment(db: Session, deploy_id: int):
    return db.query(Deployment).filter(Deployment.id == deploy_id).first()


def create_deployment(db: Session, data: DeployCreate):
    existing = db.query(Deployment).filter(Deployment.service_name == data.service_name).first()
    if existing:
        if existing.status == "running":
            raise ValueError(f"服务名 '{data.service_name}' 已在运行中，请使用其他名称")
        else:
            db.delete(existing)
            db.commit()

    deployment = Deployment(**data.model_dump(), status="pending")
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    return deployment


def update_deployment_status(db: Session, deploy_id: int, status: str, yaml_content: str = None):
    deployment = db.query(Deployment).filter(Deployment.id == deploy_id).first()
    if not deployment:
        return None
    deployment.status = status
    if yaml_content:
        deployment.yaml_content = yaml_content
    db.commit()
    db.refresh(deployment)
    return deployment


def delete_deployment(db: Session, deploy_id: int):
    deployment = db.query(Deployment).filter(Deployment.id == deploy_id).first()
    if not deployment:
        return False
    db.delete(deployment)
    db.commit()
    return True
