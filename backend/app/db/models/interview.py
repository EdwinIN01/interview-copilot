from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.models.user import gen_id


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String(36), primary_key=True, default=gen_id)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    resume_id = Column(String(36), ForeignKey("resumes.id"), nullable=False)
    kb_id = Column(String(36), ForeignKey("knowledge_bases.id"), nullable=True)

    role_category = Column(String(50), nullable=False)
    difficulty = Column(String(20), nullable=False, default="medium")
    duration_minutes = Column(Integer, nullable=False, default=30)
    personality = Column(String(20), nullable=False, default="gentle")
    voice_enabled = Column(Boolean, nullable=False, default=False)
    code_enabled = Column(Boolean, nullable=False, default=False)
    multi_agent = Column(Boolean, nullable=False, default=False)

    status = Column(String(20), nullable=False, default="created")
    total_score = Column(Numeric(4, 1))
    question_count = Column(Integer, nullable=False, default=0)
    code_content = Column(Text, nullable=True)  # 代码编辑器内容
    code_language = Column(String(20), nullable=True, default="python")  # 代码语言

    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interviews")
    resume = relationship("Resume")
    messages = relationship("Message", back_populates="interview", cascade="all, delete-orphan", order_by="Message.created_at")
    evaluations = relationship("Evaluation", back_populates="interview", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="interview", uselist=False, cascade="all, delete-orphan")
