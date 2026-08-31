from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.resume import Resume
from app.core.dependencies import get_current_user
from app.schemas.resume import ResumeOut, ResumeUpdate
from app.schemas.common import ApiResponse
from app.services.resume_service import parse_resume
import os
import uuid

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=ApiResponse[list])
async def list_resumes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()))
    resumes = result.scalars().all()
    return ApiResponse(data=[ResumeOut.model_validate(r).model_dump() for r in resumes])


@router.post("/upload", response_model=ApiResponse[ResumeOut])
async def upload_resume(
    file: UploadFile = File(...),
    name: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx", "doc", "txt"):
        raise HTTPException(status_code=400, detail="仅支持 PDF/DOCX/TXT 格式")

    file_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # 解析简历
    parsed = await parse_resume(save_path, ext)

    resume = Resume(
        user_id=current_user.id,
        name=name or file.filename,
        file_path=save_path,
        file_type=ext,
        content_text=parsed.get("content_text", ""),
        parsed_data=__import__("json").dumps(parsed.get("parsed_data", {}), ensure_ascii=False),
    )
    db.add(resume)
    await db.flush()
    return ApiResponse(data=ResumeOut.model_validate(resume))


@router.get("/{resume_id}", response_model=ApiResponse[ResumeOut])
async def get_resume(resume_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    return ApiResponse(data=ResumeOut.model_validate(resume))


@router.put("/{resume_id}", response_model=ApiResponse[ResumeOut])
async def update_resume(resume_id: str, data: ResumeUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "parsed_data" and value is not None:
            import json
            value = json.dumps(value, ensure_ascii=False)
        setattr(resume, field, value)
    await db.flush()
    return ApiResponse(data=ResumeOut.model_validate(resume))


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    await db.delete(resume)
    return ApiResponse(message="删除成功")
