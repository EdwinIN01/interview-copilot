from langchain_core.messages import AIMessage
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.ws.connection_manager import manager


async def opening_node(state: InterviewState) -> InterviewState:
    """开场节点：AI 面试官自我介绍 + 说明流程（不 interrupt，自我介绍作为第一个问题）"""
    prompt = f"""你是一位{_get_personality(state['personality'])}的{state['role_category']}面试官。

候选人简历摘要：
{state['resume_content'][:2000]}

面试配置：
- 难度：{state['difficulty']}
- 时长：{state['duration_minutes']}分钟

请完成开场：
1. 简短自我介绍
2. 说明面试流程和规则
3. 告诉候选人接下来会请他做自我介绍

要求：语气{_get_personality(state['personality'])}，简洁明了，不超过150字。直接输出开场内容，不要在开场中直接要求自我介绍，只说"接下来我们先从自我介绍开始"。"""

    llm = get_llm("opening")
    full_content = ""
    async for chunk in llm.astream(prompt):
        delta = chunk.content if hasattr(chunk, "content") else str(chunk)
        if delta:
            full_content += delta
            await manager.send_stream_chunk(state["interview_id"], "server:opening", delta)

    await manager.send_personal(state["interview_id"], {
        "type": "server:opening_end", "data": {"content": full_content},
    })

    return {
        "phase": "opening",
        "messages": [AIMessage(content=full_content, additional_kwargs={"type": "opening"})],
        "current_question_num": 0,
    }


def _get_personality(p: str) -> str:
    return {"gentle": "温和友好", "strict": "严格专业", "pressure": "压力面"}.get(p, "温和友好")
