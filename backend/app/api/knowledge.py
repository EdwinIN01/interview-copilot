from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.knowledge import KnowledgeBase, KnowledgeDoc
from app.core.dependencies import get_current_user
from app.schemas.resume import KnowledgeBaseCreate, KnowledgeBaseOut, KnowledgeDocOut
from app.schemas.common import ApiResponse
import os
import uuid

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "kb_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=ApiResponse[list])
async def list_kbs(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.user_id == current_user.id).order_by(KnowledgeBase.created_at.desc()))
    kbs = result.scalars().all()
    return ApiResponse(data=[KnowledgeBaseOut.model_validate(k).model_dump() for k in kbs])


@router.post("", response_model=ApiResponse[KnowledgeBaseOut])
async def create_kb(data: KnowledgeBaseCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    kb = KnowledgeBase(user_id=current_user.id, name=data.name, description=data.description, role_category=data.role_category)
    db.add(kb)
    await db.flush()
    return ApiResponse(data=KnowledgeBaseOut.model_validate(kb))


@router.delete("/{kb_id}")
async def delete_kb(kb_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb or kb.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="知识库不存在")
    await db.delete(kb)
    return ApiResponse(message="删除成功")


@router.get("/{kb_id}/docs", response_model=ApiResponse[list])
async def list_docs(kb_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb or kb.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="知识库不存在")
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.kb_id == kb_id).order_by(KnowledgeDoc.created_at.desc()))
    docs = result.scalars().all()
    return ApiResponse(data=[KnowledgeDocOut.model_validate(d).model_dump() for d in docs])


@router.post("/{kb_id}/docs/upload", response_model=ApiResponse[KnowledgeDocOut])
async def upload_doc(kb_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb or kb.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="知识库不存在")
    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx", "txt", "md"):
        raise HTTPException(status_code=400, detail="仅支持 PDF/DOCX/TXT/MD")

    doc_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{doc_id}.{ext}")
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    doc = KnowledgeDoc(kb_id=kb_id, file_name=file.filename, file_path=save_path, status="pending")
    db.add(doc)
    await db.flush()

    # 异步处理向量化
    import asyncio
    from app.services.knowledge_service import process_document
    asyncio.create_task(process_document(doc_id, kb_id, save_path, ext))

    return ApiResponse(data=KnowledgeDocOut.model_validate(doc))


@router.delete("/{kb_id}/docs/{doc_id}")
async def delete_doc(kb_id: str, doc_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await db.get(KnowledgeDoc, doc_id)
    if not doc or doc.kb_id != kb_id:
        raise HTTPException(status_code=404, detail="文档不存在")
    await db.delete(doc)
    return ApiResponse(message="删除成功")


@router.get("/{kb_id}/docs/{doc_id}/status")
async def get_doc_status(kb_id: str, doc_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await db.get(KnowledgeDoc, doc_id)
    if not doc or doc.kb_id != kb_id:
        raise HTTPException(status_code=404, detail="文档不存在")
    return ApiResponse(data={"status": doc.status, "chunk_count": doc.chunk_count, "error_message": doc.error_message})
