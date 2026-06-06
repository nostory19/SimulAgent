"""
数据库引擎和会话管理模块。

使用 SQLAlchemy 异步引擎连接 SQLite（本地单用户模式），
提供 session 工厂、基类和自动建表功能。
"""
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///../data/simulagent.db")

# 将 SQLite 相对路径转换为绝对路径，确保 workdir 变化时仍能正确连接
if DATABASE_URL.startswith("sqlite"):
    db_path = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
    if not os.path.isabs(db_path):
        abs_path = str(Path(__file__).parent.parent.parent.parent / "data" / "simulagent.db")
        DATABASE_URL = f"sqlite+aiosqlite:///{abs_path}"

# 异步引擎（echo=False 关闭SQL日志）
engine = create_async_engine(DATABASE_URL, echo=False)

# 异步 session 工厂（expire_on_commit=False 避免提交后属性过期）
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """SQLAlchemy ORM 基类，所有数据模型继承此类。"""
    pass


async def get_db():
    """FastAPI 依赖注入：获取一个异步数据库 session，请求结束后自动关闭。"""
    async with async_session() as session:
        yield session


async def init_db():
    """初始化数据库：根据所有 ORM 模型创建表（幂等，已有表不会重复创建）。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
