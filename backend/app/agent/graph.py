from datetime import datetime
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.agent.state import InterviewState
from app.agent.nodes.opening import opening_node
from app.agent.nodes.question import question_node, wait_for_answer_node
from app.agent.nodes.evaluate import evaluate_node
from app.agent.nodes.followup import followup_node
from app.agent.nodes.code_question import code_question_node
from app.agent.nodes.reverse import reverse_node
from app.agent.nodes.summary import summary_node


def after_evaluate(state: InterviewState) -> str:
    """条件边：评估后决定下一步"""
    # 计算已用时间
    try:
        start = datetime.fromisoformat(state["start_time"])
        elapsed = (datetime.now() - start).total_seconds() / 60
    except Exception:
        elapsed = 0
    remaining_ratio = 1 - elapsed / max(state["duration_minutes"], 1)

    # 1. 时间到了
    if remaining_ratio <= 0.1:
        return "summary" if state["phase"] == "reverse" else "reverse"

    # 2. 自我介绍后直接下一题，不追问
    latest_eval = state["evaluations"][-1] if state["evaluations"] else None
    if latest_eval and latest_eval.get("is_intro"):
        return "question"

    # 3. 评分低且有明确薄弱点且未超过追问上限 → 追问
    has_weak_points = latest_eval and len(latest_eval.get("weak_points", [])) > 0
    if (latest_eval and latest_eval.get("overall_score", 10) < 5.0
            and has_weak_points
            and state["followup_count"] < state["max_followups"]):
        return "followup"

    # 4. 代码题模式，随机出代码题
    if (state.get("code_enabled") and state["difficulty"] != "easy"
            and state["current_question_num"] > 0
            and not any(m.additional_kwargs.get("type") == "code_question" for m in state["messages"])
            and __import__("random").random() < 0.2):
        return "code"

    # 5. 剩余时间 15% → 反问
    if remaining_ratio <= 0.15 and state["phase"] != "reverse":
        return "reverse"

    # 6. 默认 → 下一题
    return "question"


# 构建状态图
builder = StateGraph(InterviewState)

# 添加节点
builder.add_node("opening", opening_node)
builder.add_node("question", question_node)
builder.add_node("wait_for_answer", wait_for_answer_node)
builder.add_node("evaluate", evaluate_node)
builder.add_node("followup", followup_node)
builder.add_node("code", code_question_node)
builder.add_node("reverse", reverse_node)
builder.add_node("summary", summary_node)

# 添加边
builder.add_edge(START, "opening")
builder.add_edge("opening", "question")
# 问题/追问/代码题 → 等待回答 → 评估
builder.add_edge("question", "wait_for_answer")
builder.add_edge("followup", "wait_for_answer")
builder.add_edge("code", "wait_for_answer")
builder.add_edge("wait_for_answer", "evaluate")
builder.add_edge("reverse", "summary")

# 条件边
builder.add_conditional_edges(
    "evaluate",
    after_evaluate,
    {
        "followup": "followup",
        "question": "question",
        "code": "code",
        "reverse": "reverse",
        "summary": "summary",
    },
)

builder.add_edge("summary", END)

# Checkpoint（状态持久化）
checkpointer = MemorySaver()

# 编译图
interview_graph = builder.compile(checkpointer=checkpointer)
