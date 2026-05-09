from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

DATABASE_URL = "sqlite:///./deploy_platform.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    ip = Column(String(50), nullable=False, unique=True)
    ssh_user = Column(String(50), nullable=False)
    ssh_password = Column(String(100), nullable=True)
    ssh_port = Column(Integer, default=22)
    ssh_key = Column(Text, nullable=True)
    status = Column(String(20), default="offline")
    gpu_count = Column(Integer, default=0)
    gpu_available = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Model(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    path = Column(String(500), nullable=False)
    key_path = Column(String(500), nullable=True)
    gpu_required = Column(Integer, nullable=False)
    size = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), nullable=False, unique=True)
    server_id = Column(Integer, nullable=False)
    model_id = Column(Integer, nullable=False)
    image = Column(String(100), nullable=False)
    port = Column(Integer, nullable=False)
    gpus = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    yaml_content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ImageVersion(Base):
    __tablename__ = "image_versions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    version = Column(String(50), nullable=False)
    image_url = Column(String(500), nullable=False)
    is_latest = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
