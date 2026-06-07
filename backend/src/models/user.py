"""用户数据模型——注册/登录/会话管理。"""
import uuid
import hashlib
import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from .database import Base


def _gen_uuid(): return str(uuid.uuid4())
def _utcnow(): return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=False)
    password_hash = Column(String(128), nullable=False)
    token = Column(String(64), unique=True, nullable=True)  # 登录会话token
    created_at = Column(DateTime, nullable=False, default=_utcnow)

    @staticmethod
    def hash_password(password: str) -> str:
        salt = "simulagent_salt_v1"
        return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()

    @staticmethod
    def generate_token() -> str:
        return secrets.token_hex(32)

    def verify_password(self, password: str) -> bool:
        return self.password_hash == self.hash_password(password)
