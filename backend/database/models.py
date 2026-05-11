from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = "sqlite:///./deploy_platform.db"

# SQLite uses StaticPool for threaded access; pool_size etc are for connection-pooling DBs
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)
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
    service_name = Column(String(100), nullable=False)
    server_id = Column(Integer, nullable=False)
    model_id = Column(Integer, nullable=False)
    image = Column(String(100), nullable=False)
    port = Column(Integer, nullable=False)
    gpus = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    yaml_content = Column(Text)
    from_source = Column(String(20), default="manual")
    detected_model_name = Column(String(200), nullable=True)
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
    # 兼容旧数据库: 如果 from_source 列不存在则添加
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE deployments ADD COLUMN from_source VARCHAR(20) DEFAULT 'manual'"))
            conn.commit()
        except Exception:
            pass  # 列已存在
        try:
            conn.execute(text("ALTER TABLE deployments ADD COLUMN detected_model_name VARCHAR(200)"))
            conn.commit()
        except Exception:
            pass  # 列已存在

        # 将 service_name 的旧唯一约束改为 (server_id, service_name) 联合唯一
        # SQLite 不支持直接修改约束, 需要重建表
        try:
            from sqlalchemy import inspect as sa_inspect
            # Check table schema for old UNIQUE(service_name) constraint
            result = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='deployments'"))
            row = result.fetchone()
            if row and row[0]:
                schema = row[0]
                # Detect old constraint: UNIQUE (service_name) in table DDL
                has_old_unique = "UNIQUE (service_name)" in schema or "UNIQUE(service_name)" in schema
                has_new_unique = "UNIQUE (server_id, service_name)" in schema
                if has_old_unique and not has_new_unique:
                    logger.info("检测到旧唯一约束, 开始迁移部署表唯一索引...")
                    conn.execute(text("""
                        CREATE TABLE deployments_new (
                            id INTEGER PRIMARY KEY,
                            service_name VARCHAR(100) NOT NULL,
                            server_id INTEGER NOT NULL,
                            model_id INTEGER NOT NULL,
                            image VARCHAR(100) NOT NULL,
                            port INTEGER NOT NULL,
                            gpus VARCHAR(50) NOT NULL,
                            status VARCHAR(20) DEFAULT 'pending',
                            yaml_content TEXT,
                            from_source VARCHAR(20) DEFAULT 'manual',
                            detected_model_name VARCHAR(200),
                            created_at DATETIME DEFAULT (datetime('now')),
                            UNIQUE (server_id, service_name)
                        )
                    """))
                    conn.execute(text("""
                        INSERT INTO deployments_new
                        SELECT id, service_name, server_id, model_id, image, port, gpus,
                               status, yaml_content, from_source, detected_model_name, created_at
                        FROM deployments
                    """))
                    conn.execute(text("DROP TABLE deployments"))
                    conn.execute(text("ALTER TABLE deployments_new RENAME TO deployments"))
                    conn.commit()
                    logger.info("部署表唯一索引迁移完成: (server_id, service_name) 联合唯一")
        except Exception as e:
            logger.warning(f"部署表唯一索引迁移可能已完成: {e}")
            conn.rollback()
