from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class InterviewCreate(BaseModel):
    resume_id: str
    kb_id: Optional[str] = None
    role_category: str = Field(..., description="algorithm/backend/frontend/fullstack/pm")
    difficulty: str = "medium"
    duration_minutes: int = 30
    personality: str = "gentle"
    voice_enabled: bool = False
    code_enabled: bool = False
    multi_agent: bool = False


class InterviewOut(BaseModel):
    id: str
    role_category: str
    difficulty: str
    duration_minutes: int
    personality: str
    status: str
    total_score: Optional[float] = None
    question_count: int
    code_enabled: bool = False
    code_content: Optional[str] = None
    code_language: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewStartResponse(BaseModel):
    interview_id: str
    status: str
    ws_url: str
    thread_id: str


class EvaluationOut(BaseModel):
    question_num: int
    tech_depth: Optional[float] = None
    expression: Optional[float] = None
    adaptability: Optional[float] = None
    foundation: Optional[float] = None
    overall_score: Optional[float] = None
    comment: Optional[str] = None
    suggested_answer: Optional[str] = None
    followup_count: int = 0

    class Config:
        from_attributes = True


class ReportOut(BaseModel):
    id: str
    interview_id: str
    total_score: float
    dimension_scores: Optional[dict] = None
    question_reviews: Optional[list] = None
    weaknesses: Optional[list] = None
    suggestions: Optional[list] = None
    overall_comment: Optional[str] = None
    observer_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
