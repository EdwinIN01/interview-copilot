import json
import random
from datetime import datetime
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import interrupt
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.ws.connection_manager import manager


async def question_node(state: InterviewState) -> InterviewState:
    """提问节点：生成下一个问题（不等待回答，直接返回状态）"""
    question_num = state["current_question_num"] + 1

    # 第一个问题：自我介绍
    if question_num == 1:
        full_content = "请先用1分钟做个自我介绍，包括你的教育背景、技术栈和项目经历。"
        question_type = "intro"
    else:
        # RAG 检索（如果启用了知识库）
        retrieved_context = state.get("retrieved_context", "")
        if state.get("kb_id"):
            try:
                from app.rag.retrieve import retrieve_knowledge
                retrieved_context = await retrieve_knowledge(state["kb_id"], f"{state['role_category']} 面试题")
            except Exception:
                pass

        # 构建历史对话摘要
        history = _format_history(state["messages"])

        prompt = f"""你是一位{state['role_category']}面试官，正在进行第{question_num}题（共约{state['total_questions']}题）。

候选人简历摘要：
{state['resume_content'][:2000]}

历史对话：
{history}

难度：{state['difficulty']}
{('参考知识库内容：\n' + retrieved_context) if retrieved_context else ''}

请生成一个{state['difficulty']}难度的{state['role_category']}面试题。
要求：
1. 问题简洁明了，不超过80字
2. 一次只问一个核心问题，不要拆成多个小问题
3. 问题具体有深度，与候选人简历相关
4. 直接输出问题内容，不要加解释、不要编号、不要markdown格式"""

        llm = get_llm("question")
        full_content = ""
        async for chunk in llm.astream(prompt):
            delta = chunk.content if hasattr(chunk, "content") else str(chunk)
            if delta:
                full_content += delta
                await manager.send_stream_chunk(state["interview_id"], "server:question_chunk", delta)

        question_type = "concept"

    # 发送问题结束事件
    await manager.send_personal(state["interview_id"], {
        "type": "server:question_end",
        "data": {"question_num": question_num, "content": full_content, "question_type": question_type},
    })

    print(f"[DEBUG question] 生成问题 q_num={question_num}, type={question_type}, content前50字={full_content[:50]}")

    # 直接返回状态（问题已保存到 current_question，下一步等待回答）
    return {
        "phase": "technical",
        "current_question_num": question_num,
        "current_question": full_content,
        "current_question_type": question_type,
        "followup_count": 0,
        "last_action_time": datetime.now().isoformat(),
        "messages": [
            AIMessage(content=full_content, additional_kwargs={"type": "question", "question_num": question_num}),
        ],
    }


async def wait_for_answer_node(state: InterviewState) -> InterviewState:
    """等待用户回答节点：interrupt 暂停，等待用户提交回答"""
    question_num = state["current_question_num"]
    current_question = state["current_question"]

    print(f"[DEBUG wait_for_answer] 等待回答 q_num={question_num}, question前50字={current_question[:50]}")

    # interrupt 等待用户回答
    user_answer = interrupt({
        "type": "wait_for_answer",
        "question_num": question_num,
        "question_content": current_question,
    })

    print(f"[DEBUG wait_for_answer] 收到回答 q_num={question_num}, answer前50字={user_answer[:50] if user_answer else '空'}")

    # 返回状态（包含用户回答）
    return {
        "last_action_time": datetime.now().isoformat(),
        "messages": [
            HumanMessage(content=user_answer, additional_kwargs={"type": "answer", "question_num": question_num}),
        ],
        "user_answer": user_answer,
    }


def _format_history(messages) -> str:
    """格式化历史对话摘要"""
    if not messages:
        return "无"
    history_lines = []
    for msg in messages[-6:]:  # 最近3轮
        if hasattr(msg, "content"):
            role = "面试官" if isinstance(msg, AIMessage) else "候选人"
            content = msg.content[:100] if msg.content else ""
            history_lines.append(f"{role}: {content}")
    return "\n".join(history_lines) if history_lines else "无"
