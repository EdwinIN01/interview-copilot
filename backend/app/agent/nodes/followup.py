from langchain_core.messages import AIMessage
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.ws.connection_manager import manager


async def followup_node(state: InterviewState) -> InterviewState:
    """追问节点：基于薄弱点生成追问（不等待回答，直接返回状态）"""
    latest_eval = state["evaluations"][-1] if state["evaluations"] else {}
    weak_points = latest_eval.get("weak_points", [])
    followup_num = state["followup_count"] + 1

    prompt = f"""你是一位{state['role_category']}面试官。

当前问题：{state['current_question']}
候选人回答：{state.get('user_answer', state['messages'][-1].content if state['messages'] else '')}
候选人薄弱点：{'; '.join(weak_points) if weak_points else '回答不够深入'}

请针对最关键的一个薄弱点进行追问：
1. 追问要具体，引导候选人深入解释
2. 不要直接告诉答案
3. 不超过80字

直接输出追问内容。"""

    llm = get_llm("followup")
    full_content = ""
    async for chunk in llm.astream(prompt):
        delta = chunk.content if hasattr(chunk, "content") else str(chunk)
        if delta:
            full_content += delta
            await manager.send_stream_chunk(state["interview_id"], "server:followup_chunk", delta)

    await manager.send_personal(state["interview_id"], {
        "type": "server:followup_end",
        "data": {"followup_num": followup_num, "content": full_content,
                 "reason": f"针对薄弱点：{weak_points[0] if weak_points else '回答不够深入'}"},
    })

    print(f"[DEBUG followup] 生成追问 q_num={state['current_question_num']}, followup_num={followup_num}, content前50字={full_content[:50]}")

    # 把追问追加到当前问题后面，评估时一起评估
    combined_question = f"{state['current_question']}\n\n追问：{full_content}"

    return {
        "phase": "followup",
        "followup_count": followup_num,
        "current_question": combined_question,
        "messages": [
            AIMessage(content=full_content, additional_kwargs={"type": "followup", "followup_num": followup_num, "question_num": state["current_question_num"]}),
        ],
    }
