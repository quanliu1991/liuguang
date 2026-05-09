from sqlalchemy.orm import Session
from database.models import Model
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ModelCreate(BaseModel):
    name: str
    path: str
    key_path: Optional[str] = None
    gpu_required: int
    size: Optional[str] = None


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    key_path: Optional[str] = None
    gpu_required: Optional[int] = None
    size: Optional[str] = None


class ModelResponse(BaseModel):
    id: int
    name: str
    path: str
    key_path: Optional[str]
    gpu_required: int
    size: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


def get_models(db: Session):
    return db.query(Model).all()


def get_model(db: Session, model_id: int):
    return db.query(Model).filter(Model.id == model_id).first()


def create_model(db: Session, data: ModelCreate):
    model = Model(**data.model_dump())
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def update_model(db: Session, model_id: int, data: ModelUpdate):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(model, key, value)
    db.commit()
    db.refresh(model)
    return model


def delete_model(db: Session, model_id: int):
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        return False
    db.delete(model)
    db.commit()
    return True
