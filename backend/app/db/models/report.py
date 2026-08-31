from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.models.user import gen_id


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=gen_id)
    interview_id = Column(String(36), ForeignKey("interviews.id"), nullable=False, unique=True)
    total_score = Column(Numeric(4, 1), nullable=False)
    dimension_scores = Column(Text)  # JSON
    question_reviews = Column(Text)  # JSON
    weaknesses = Column(Text)  # JSON
    suggestions = Column(Text)  # JSON
    overall_comment = Column(Text)
    observer_comment = Column(Text)
    share_token = Column(String(64), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="report")
