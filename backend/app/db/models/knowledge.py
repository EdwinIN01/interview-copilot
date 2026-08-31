from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.models.user import gen_id


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(String(36), primary_key=True, default=gen_id)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    role_category = Column(String(50))
    doc_count = Column(Integer, nullable=False, default=0)
    chunk_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="knowledge_bases")
    docs = relationship("KnowledgeDoc", back_populates="kb", cascade="all, delete-orphan")


class KnowledgeDoc(Base):
    __tablename__ = "knowledge_docs"

    id = Column(String(36), primary_key=True, default=gen_id)
    kb_id = Column(String(36), ForeignKey("knowledge_bases.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500))
    content_text = Column(Text)
    chunk_count = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="pending")
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    kb = relationship("KnowledgeBase", back_populates="docs")
