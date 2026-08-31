from sqlalchemy import Column, String, Integer, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.db.base import Base
import uuid


def gen_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_id)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50))
    avatar_url = Column(String(500))
    target_role = Column(String(50))
    role_detail = Column(String(100))  # 细分方向，如 CV/NLP/推荐系统
    tech_stack = Column(Text)  # 技术栈，JSON 数组字符串
    target_company = Column(String(50))  # 目标公司类型，如 大厂/中小厂/国企/金融
    job_description = Column(Text)  # 自定义岗位描述（JD），可粘贴招聘网站的职位详情
    graduation_year = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    knowledge_bases = relationship("KnowledgeBase", back_populates="user", cascade="all, delete-orphan")
    stats = relationship("UserStats", back_populates="user", uselist=False, cascade="all, delete-orphan")
