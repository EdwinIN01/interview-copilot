from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.models.user import gen_id


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=gen_id)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    file_path = Column(String(500))
    file_type = Column(String(20))
    content_text = Column(Text)
    parsed_data = Column(Text)  # JSON 字符串
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="resumes")
