import json
from langchain_core.messages import AIMessage
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.ws.connection_manager import manager


async def code_question_node(state: InterviewState) -> InterviewState:
    """代码题节点：出算法题（不等待回答，直接返回状态）"""
    question_num = state["current_question_num"] + 1

    prompt = f"""请生成一道{state['difficulty']}难度的算法面试题，适合{state['role_category']}岗位。

要求：
1. 题目描述清晰简洁，不超过100字
2. 提供1个示例（含输入输出）
3. 给出约束条件
4. 难度：{state['difficulty']}

输出JSON：
{{"title": "题目标题", "description": "题目描述", "examples": [{{"input": "...", "output": "..."}}], "constraints": ["约束1"]}}"""

    llm = get_llm("question")
    response = await llm.ainvoke(prompt)
    try:
        code_q = json.loads(response.content)
    except Exception:
        code_q = {"title": "算法题", "description": "请实现一个函数，解决给定的问题。", "examples": [], "constraints": []}

    # 格式化题目内容
    examples_text = ""
    if code_q.get("examples"):
        ex = code_q["examples"][0]
        examples_text = f"\n\n示例：\n输入：{ex.get('input', '')}\n输出：{ex.get('output', '')}"
    constraints_text = ""
    if code_q.get("constraints"):
        constraints_text = "\n约束：" + "，".join(code_q["constraints"][:2])

    full_content = f"【代码题】{code_q.get('title', '算法题')}\n{code_q.get('description', '')}{examples_text}{constraints_text}"

    # 流式推送题目
    await manager.send_stream_chunk(state["interview_id"], "server:question_chunk", full_content)
    await manager.send_personal(state["interview_id"], {
        "type": "server:question_end",
        "data": {"question_num": question_num, "content": full_content, "question_type": "code"},
    })

    print(f"[DEBUG code_question] 生成代码题 q_num={question_num}, content前50字={full_content[:50]}")

    return {
        "phase": "technical",
        "current_question_num": question_num,
        "current_question": full_content,
        "current_question_type": "code",
        "followup_count": 0,
        "messages": [
            AIMessage(content=full_content, additional_kwargs={"type": "code_question", "question_num": question_num}),
        ],
    }
