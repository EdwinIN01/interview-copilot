from typing import TypedDict, Annotated, Optional, List, Dict, Any
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class InterviewState(TypedDict):
    # 基础配置
    interview_id: str
    user_id: str
    resume_id: str
    resume_content: str
    role_category: str
    difficulty: str
    personality: str
    duration_minutes: int
    kb_id: Optional[str]
    code_enabled: bool
    multi_agent: bool

    # 运行时状态
    phase: str  # opening/technical/followup/code/reverse/summary
    current_question_num: int
    current_question: str
    current_question_type: str
    followup_count: int
    max_followups: int

    # 对话历史
    messages: Annotated[List[BaseMessage], add_messages]

    # 评分数据
    evaluations: List[Dict[str, Any]]

    # 知识库
    retrieved_context: str

    # 时间
    start_time: str
    last_action_time: str

    # 元数据
    total_questions: int
    observer_notes: List[str]
    error: Optional[str]

    # 用户回答（interrupt 恢复时注入）
    user_answer: Optional[str]

    # 待回答的问题（interrupt 前保存，恢复后读取）
    pending_question: Optional[str]
    pending_question_num: Optional[int]
