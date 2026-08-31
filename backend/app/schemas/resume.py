from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
import json


class ResumeOut(BaseModel):
    id: str
    name: str
    file_type: Optional[str] = None
    content_text: Optional[str] = None
    parsed_data: Optional[dict] = None
    is_default: bool = False
    created_at: datetime

    @field_validator("parsed_data", mode="before")
    @classmethod
    def parse_json_string(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v

    class Config:
        from_attributes = True


class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    parsed_data: Optional[dict] = None
    is_default: Optional[bool] = None


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    role_category: Optional[str] = None


class KnowledgeBaseOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    role_category: Optional[str] = None
    doc_count: int = 0
    chunk_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeDocOut(BaseModel):
    id: str
    kb_id: str
    file_name: str
    chunk_count: int = 0
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
