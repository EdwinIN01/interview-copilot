from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.models.user import gen_id


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String(36), primary_key=True, default=gen_id)
    interview_id = Column(String(36), ForeignKey("interviews.id"), nullable=False, index=True)
    question_num = Column(Integer, nullable=False)
    tech_depth = Column(Numeric(3, 1))
    expression = Column(Numeric(3, 1))
    adaptability = Column(Numeric(3, 1))
    foundation = Column(Numeric(3, 1))
    overall_score = Column(Numeric(3, 1))
    comment = Column(Text)
    suggested_answer = Column(Text)
    followup_count = Column(Integer, nullable=False, default=0)
    weak_points = Column(Text)  # JSON 数组字符串
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="evaluations")
