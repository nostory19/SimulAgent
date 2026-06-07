"""用户认证 API——注册/登录/登出。"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from typing import Optional
from ...models.database import get_db
from ...models.user import User
from ...models.session import CaptureSession

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


async def _get_usage(db: AsyncSession, user_id: str) -> int:
    """查询用户已使用的翻译时长（秒）。"""
    result = await db.execute(
        select(func.coalesce(func.sum(CaptureSession.duration_seconds), 0))
        .where(CaptureSession.user_id == user_id, CaptureSession.status == "completed")
    )
    return result.scalar() or 0


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    user_id: str
    username: str
    email: str
    token: str
    usage_seconds: int = 0
    quota_seconds: int = 3600


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """注册新用户。"""
    # 检查邮箱是否已存在
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="该邮箱已注册")

    user = User(
        email=req.email,
        username=req.username,
        password_hash=User.hash_password(req.password),
        token=User.generate_token(),
    )
    db.add(user)
    await db.commit()

    return AuthResponse(
        user_id=user.id, username=user.username,
        email=user.email, token=user.token,
        usage_seconds=0, quota_seconds=user.quota_seconds,
    )


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录。"""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not user.verify_password(req.password):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    # 刷新 token
    user.token = User.generate_token()
    await db.commit()

    usage_seconds = await _get_usage(db, user.id)

    return AuthResponse(
        user_id=user.id, username=user.username,
        email=user.email, token=user.token,
        usage_seconds=usage_seconds, quota_seconds=user.quota_seconds,
    )


@router.get("/me")
async def me(
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None,
):
    """通过 token 获取当前用户信息。优先从 Authorization header 读取。"""
    # 从 Authorization: Bearer <token> 或 query param 中提取 token
    bearer_token = None
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization[7:]
    effective_token = bearer_token or token
    if not effective_token:
        raise HTTPException(status_code=401, detail="未登录")
    result = await db.execute(select(User).where(User.token == effective_token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="未登录")

    usage_seconds = await _get_usage(db, user.id)

    return AuthResponse(
        user_id=user.id, username=user.username,
        email=user.email, token=user.token,
        usage_seconds=usage_seconds, quota_seconds=user.quota_seconds,
    )
