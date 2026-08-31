import os
from app.config import settings

_chroma_client = None
_collection_cache = {}


def _get_chroma():
    """获取 Chroma 客户端（开发用本地向量库）"""
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
    return _chroma_client


def _get_embedding_fn():
    """获取 embedding 函数"""
    from app.config import settings
    if settings.DEEPSEEK_API_KEY or settings.OPENAI_API_KEY:
        try:
            from chromadb.utils import embedding_functions
            api_key = settings.DEEPSEEK_API_KEY or settings.OPENAI_API_KEY
            return embedding_functions.OpenAIEmbeddingFunction(
                api_key=api_key,
                api_base=settings.DEEPSEEK_BASE_URL if settings.DEEPSEEK_API_KEY else None,
                model_name="text-embedding-3-small",
            )
        except Exception:
            pass
    # 降级：使用默认 embedding
    from chromadb.utils import embedding_functions
    return embedding_functions.DefaultEmbeddingFunction()


async def ingest_document(doc_id: str, kb_id: str, content_text: str) -> int:
    """将文档内容向量化并存入 Chroma"""
    if not content_text.strip():
        return 0

    client = _get_chroma()
    collection_name = f"kb_{kb_id}"
    collection = client.get_or_create_collection(name=collection_name, embedding_function=_get_embedding_fn())

    # 简单分块：按段落，每 500 字一块
    chunks = _chunk_text(content_text, chunk_size=500, overlap=50)

    if not chunks:
        return 0

    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"doc_id": doc_id, "chunk_index": i} for i in range(len(chunks))]

    collection.upsert(ids=ids, documents=chunks, metadatas=metadatas)
    return len(chunks)


async def retrieve_knowledge(kb_id: str, query: str, top_k: int = 5) -> str:
    """从知识库检索相关内容"""
    try:
        client = _get_chroma()
        collection_name = f"kb_{kb_id}"
        collection = client.get_collection(name=collection_name, embedding_function=_get_embedding_fn())

        results = collection.query(query_texts=[query], n_results=top_k)
        docs = results.get("documents", [[]])[0]

        if not docs:
            return ""

        parts = []
        for i, doc in enumerate(docs):
            parts.append(f"[参考{i+1}]\n{doc}")
        return "\n\n".join(parts)
    except Exception as e:
        print(f"检索失败: {e}")
        return ""


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    """简单文本分块"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
    return chunks
