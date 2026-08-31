from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import interrupt
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.ws.connection_manager import manager


async def reverse_node(state: InterviewState) -> InterviewState:
    """反问节点：模拟面试官问'你有什么问题想问我'"""
    await manager.send_personal(state["interview_id"], {
        "type": "server:reverse_question",
        "data": {"content": "好的，技术问题就到这里。你有什么问题想问我吗？可以问问团队、技术栈、工作内容等。"},
    })

    # interrupt 等待用户反问
    user_question = interrupt({"type": "wait_for_reverse"})

    # AI 以面试官身份回答
    prompt = f"""你是一位{state['role_category']}面试官。候选人问了以下问题，请以面试官身份回答：

候选人问题：{user_question}

要求：回答专业、客观，不超过200字。直接输出回答内容。"""

    llm = get_llm("question")
    response = await llm.ainvoke(prompt)
    answer = response.content if hasattr(response, "content") else str(response)

    await manager.send_personal(state["interview_id"], {
        "type": "server:reverse_answer", "data": {"content": answer},
    })

    return {
        "phase": "reverse",
        "messages": [
            AIMessage(content="你有什么问题想问我吗？", additional_kwargs={"type": "reverse"}),
            HumanMessage(content=user_question, additional_kwargs={"type": "reverse_question"}),
            AIMessage(content=answer, additional_kwargs={"type": "reverse_answer"}),
        ],
        "user_answer": None,
    }
