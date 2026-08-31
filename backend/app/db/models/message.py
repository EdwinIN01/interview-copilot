from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.models.user import gen_id


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=gen_id)
    interview_id = Column(String(36), ForeignKey("interviews.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # ai/user/system
    type = Column(String(30), nullable=False)  # opening/question/answer/followup/summary
    content = Column(Text, nullable=False)
    question_num = Column(Integer)
    meta_data = Column(Text)  # JSON 字符串
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="messages")
