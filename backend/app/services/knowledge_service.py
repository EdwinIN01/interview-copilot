import asyncio
from app.db.session import async_session
from app.db.models.knowledge import KnowledgeDoc, KnowledgeBase
from app.rag.retrieve import ingest_document
from sqlalchemy import select


async def process_document(doc_id: str, kb_id: str, file_path: str, ext: str):
    """异步处理文档摄入：提取文本 → 分块 → 向量化"""
    try:
        # 更新状态为处理中
        async with async_session() as db:
            doc = await db.get(KnowledgeDoc, doc_id)
            if doc:
                doc.status = "processing"
                await db.commit()

        # 提取文本
        content_text = ""
        if ext == "pdf":
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                content_text = "\n".join([p.extract_text() or "" for p in pdf.pages])
        elif ext in ("docx", "doc"):
            from docx import Document
            d = Document(file_path)
            content_text = "\n".join([p.text for p in d.paragraphs])
        elif ext in ("txt", "md"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content_text = f.read()

        # 向量化
        chunk_count = await ingest_document(doc_id, kb_id, content_text)

        # 更新状态
        async with async_session() as db:
            doc = await db.get(KnowledgeDoc, doc_id)
            if doc:
                doc.content_text = content_text[:10000]
                doc.chunk_count = chunk_count
                doc.status = "completed"
                kb = await db.get(KnowledgeBase, kb_id)
                if kb:
                    kb.chunk_count = (kb.chunk_count or 0) + chunk_count
                await db.commit()

    except Exception as e:
        async with async_session() as db:
            doc = await db.get(KnowledgeDoc, doc_id)
            if doc:
                doc.status = "failed"
                doc.error_message = str(e)[:500]
                await db.commit()
        print(f"文档处理失败: {e}")
