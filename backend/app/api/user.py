from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.user import UserOut, UserUpdate
from app.schemas.common import ApiResponse

router = APIRouter()


@router.put("/profile", response_model=ApiResponse[UserOut])
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.flush()
    return ApiResponse(data=UserOut.model_validate(current_user))


@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.db.models.stats import UserStats
    from sqlalchemy import select
    result = await db.execute(select(UserStats).where(UserStats.user_id == current_user.id))
    stats = result.scalar_one_or_none()
    return ApiResponse(data={
        "total_interviews": stats.total_interviews if stats else 0,
        "avg_score": float(stats.avg_score) if stats and stats.avg_score else None,
        "best_score": float(stats.best_score) if stats and stats.best_score else None,
    })
