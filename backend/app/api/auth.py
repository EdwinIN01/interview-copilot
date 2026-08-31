from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.session import get_db
from app.db.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenResponse
from app.schemas.common import ApiResponse

router = APIRouter()


@router.post("/register", response_model=ApiResponse[TokenResponse])
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # 检查用户名和邮箱是否已存在
    result = await db.execute(
        select(User).where(or_(User.username == data.username, User.email == data.email))
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户名或邮箱已存在")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        nickname=data.nickname or data.username,
    )
    db.add(user)
    await db.flush()

    token = create_access_token(user.id)
    return ApiResponse(data=TokenResponse(access_token=token, user=UserOut.model_validate(user)))


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(or_(User.username == data.username_or_email, User.email == data.username_or_email))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

    token = create_access_token(user.id)
    return ApiResponse(data=TokenResponse(access_token=token, user=UserOut.model_validate(user)))


@router.get("/me", response_model=ApiResponse[UserOut])
async def get_me(current_user: User = Depends(__import__("app.core.dependencies", fromlist=["get_current_user"]).get_current_user)):
    return ApiResponse(data=UserOut.model_validate(current_user))
