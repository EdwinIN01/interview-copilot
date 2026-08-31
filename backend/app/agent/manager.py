import uuid
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional
from app.agent.graph import interview_graph
from app.agent.state import InterviewState
from langgraph.types import Command
from langchain_core.messages import AIMessage


class AgentManager:
    def __init__(self):
        self.threads: dict[str, str] = {}  # interview_id -> thread_id
        self._start_locks: dict[str, asyncio.Lock] = {}
        self._answer_locks: dict[str, asyncio.Lock] = {}
        self._started: set[str] = set()

    def create_thread(self, interview_id: str) -> str:
        thread_id = str(uuid.uuid4())
        self.threads[interview_id] = thread_id
        return thread_id

    def get_config(self, interview_id: str) -> dict:
        thread_id = self.threads.get(interview_id)
        if not thread_id:
            thread_id = self.create_thread(interview_id)
        return {"configurable": {"thread_id": thread_id}}

    def is_started(self, interview_id: str) -> bool:
        return interview_id in self._started

    async def start_interview(self, interview, resume, thread_id: str):
        """启动面试：执行图从 START 到第一个 interrupt（提问节点）"""
        # 加锁，避免重复启动
        if interview.id not in self._start_locks:
            self._start_locks[interview.id] = asyncio.Lock()

        async with self._start_locks[interview.id]:
            # 双重检查
            if interview.id in self._started:
                print(f"Agent 已启动，跳过: {interview.id}")
                return

            self.threads[interview.id] = thread_id
            config = self.get_config(interview.id)

            # 构建初始状态
            parsed_data = {}
            if resume.parsed_data:
                try:
                    parsed_data = json.loads(resume.parsed_data)
                except Exception:
                    pass

            initial_state: InterviewState = {
                "interview_id": interview.id,
                "user_id": interview.user_id,
                "resume_id": interview.resume_id,
                "resume_content": resume.content_text or json.dumps(parsed_data, ensure_ascii=False)[:3000],
                "role_category": interview.role_category,
                "difficulty": interview.difficulty,
                "personality": interview.personality,
                "duration_minutes": interview.duration_minutes,
                "kb_id": interview.kb_id,
                "code_enabled": interview.code_enabled,
                "multi_agent": interview.multi_agent,
                "phase": "opening",
                "current_question_num": 0,
                "current_question": "",
                "current_question_type": "",
                "followup_count": 0,
                "max_followups": 2,
                "messages": [],
                "evaluations": [],
                "retrieved_context": "",
                "start_time": datetime.now().isoformat(),
                "last_action_time": datetime.now().isoformat(),
                "total_questions": max(interview.duration_minutes // 5, 5),
                "observer_notes": [],
                "error": None,
                "user_answer": None,
            }

            # 执行图（遇到 interrupt 会自动暂停）
            try:
                async for event in interview_graph.astream(initial_state, config, stream_mode="updates"):
                    pass  # 节点内部已通过 WebSocket 推送
                self._started.add(interview.id)
                print(f"Agent 启动成功: {interview.id}")
            except Exception as e:
                print(f"Agent 启动失败: {e}")

    async def submit_answer(self, interview_id: str, answer: str):
        """用户提交回答：恢复图执行（加锁防止并发调用）"""
        if interview_id not in self._answer_locks:
            self._answer_locks[interview_id] = asyncio.Lock()

        async with self._answer_locks[interview_id]:
            config = self.get_config(interview_id)
            try:
                async for event in interview_graph.astream(
                    Command(resume=answer),
                    config,
                    stream_mode="updates",
                ):
                    pass
            except Exception as e:
                print(f"恢复图执行失败: {e}")

    async def end_interview(self, interview_id: str):
        """主动结束面试：跳转到总结节点"""
        config = self.get_config(interview_id)
        try:
            # 先更新状态，然后用 Command(goto="summary") 跳转
            async for event in interview_graph.astream(
                Command(goto="summary"),
                config,
                stream_mode="updates",
            ):
                pass
        except Exception as e:
            print(f"结束面试失败: {e}")

    def get_state(self, interview_id: str):
        """获取当前图状态"""
        config = self.get_config(interview_id)
        return interview_graph.get_state(config)


agent_manager = AgentManager()
