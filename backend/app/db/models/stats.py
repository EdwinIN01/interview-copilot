from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class UserStats(Base):
    __tablename__ = "user_stats"

    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    total_interviews = Column(Integer, nullable=False, default=0)
    total_minutes = Column(Integer, nullable=False, default=0)
    avg_score = Column(Numeric(4, 2))
    best_score = Column(Numeric(4, 1))
    latest_interview_at = Column(DateTime(timezone=True))
    weakness_trend = Column(Text)  # JSON
    score_history = Column(Text)  # JSON
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="stats")
