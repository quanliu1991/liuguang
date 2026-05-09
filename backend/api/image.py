from sqlalchemy.orm import Session
from database.models import ImageVersion
from pydantic import BaseModel
from datetime import datetime


class ImageVersionCreate(BaseModel):
    name: str
    version: str
    image_url: str
    is_latest: bool = False


class ImageVersionUpdate(BaseModel):
    name: str = None
    version: str = None
    image_url: str = None
    is_latest: bool = None


class ImageVersionResponse(BaseModel):
    id: int
    name: str
    version: str
    image_url: str
    is_latest: int
    created_at: datetime

    class Config:
        from_attributes = True


def get_image_versions(db: Session):
    return db.query(ImageVersion).order_by(ImageVersion.created_at.desc()).all()


def get_image_version(db: Session, version_id: int):
    return db.query(ImageVersion).filter(ImageVersion.id == version_id).first()


def create_image_version(db: Session, data: ImageVersionCreate):
    if data.is_latest:
        db.query(ImageVersion).update({ImageVersion.is_latest: 0})
    version = ImageVersion(**data.model_dump())
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def update_image_version(db: Session, version_id: int, data: ImageVersionUpdate):
    version = db.query(ImageVersion).filter(ImageVersion.id == version_id).first()
    if not version:
        return None
    if data.is_latest:
        db.query(ImageVersion).filter(ImageVersion.id != version_id).update({ImageVersion.is_latest: 0})
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(version, key, value)
    db.commit()
    db.refresh(version)
    return version


def delete_image_version(db: Session, version_id: int):
    version = db.query(ImageVersion).filter(ImageVersion.id == version_id).first()
    if not version:
        return False
    db.delete(version)
    db.commit()
    return True
