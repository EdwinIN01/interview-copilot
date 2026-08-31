import json
import uuid
from collections import Counter
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.ws.connection_manager import manager


async def summary_node(state: InterviewState) -> InterviewState:
    """总结节点：生成面试报告，保存到数据库，推送结束事件"""
    evals = state["evaluations"]
    if not evals:
        total_score = 0
        avg_tech = avg_expr = avg_adapt = avg_found = 0
    else:
        avg_tech = sum(e["tech_depth"] for e in evals) / len(evals)
        avg_expr = sum(e["expression"] for e in evals) / len(evals)
        avg_adapt = sum(e["adaptability"] for e in evals) / len(evals)
        avg_found = sum(e["foundation"] for e in evals) / len(evals)
        total_score = round(avg_tech * 0.35 + avg_expr * 0.25 + avg_adapt * 0.20 + avg_found * 0.20, 1)

    # 薄弱点分析
    all_weak = []
    for e in evals:
        all_weak.extend(e.get("weak_points", []))
    weak_counter = Counter(all_weak)
    top_weak = [{"point": w, "frequency": c} for w, c in weak_counter.most_common(5)]

    # LLM 生成整体评价和建议
    prompt = f"""你是一位{state['role_category']}面试官，面试已结束。请给出整体评价。

总分：{total_score}/10
各维度：技术深度{avg_tech:.1f} 表达逻辑{avg_expr:.1f} 应变能力{avg_adapt:.1f} 基础知识{avg_found:.1f}
薄弱点：{'; '.join([w['point'] for w in top_weak]) if top_weak else '无明显薄弱点'}
题目数：{len(evals)}

输出JSON：
{{"overall_comment": "整体评价，100字以内", "suggestions": ["具体建议1", "建议2", "建议3"]}}"""

    llm = get_llm("summary")
    response = await llm.ainvoke(prompt)
    try:
        summary = json.loads(response.content)
    except Exception:
        summary = {"overall_comment": "面试完成，建议继续练习。", "suggestions": ["多做模拟面试", "加强技术深度"]}

    # 从消息历史中提取问题和回答，匹配到评估中
    question_map = {}
    answer_map = {}
    for msg in state["messages"]:
        kwargs = msg.additional_kwargs if hasattr(msg, "additional_kwargs") else {}
        q_num = kwargs.get("question_num")
        if q_num:
            if hasattr(msg, "content"):
                if kwargs.get("type") in ("question", "code_question", "opening"):
                    question_map[q_num] = msg.content
                elif kwargs.get("type") in ("answer", "code_submit", "intro_answer"):
                    answer_map[q_num] = msg.content

    # 给每个评估添加问题和回答内容
    evals_with_qa = []
    for e in evals:
        qn = e.get("question_num")
        e_copy = dict(e)
        e_copy["question"] = question_map.get(qn, "")
        e_copy["answer"] = answer_map.get(qn, "")
        evals_with_qa.append(e_copy)

    # 保存报告到数据库
    report_id = str(uuid.uuid4())
    share_token = uuid.uuid4().hex[:32]
    try:
        from app.db.session import async_session
        from app.db.models.report import Report
        from app.db.models.interview import Interview
        from datetime import datetime, timezone
        async with async_session() as db:
            report = Report(
                id=report_id,
                interview_id=state["interview_id"],
                total_score=total_score,
                dimension_scores=json.dumps({"tech_depth": round(avg_tech, 1), "expression": round(avg_expr, 1), "adaptability": round(avg_adapt, 1), "foundation": round(avg_found, 1)}, ensure_ascii=False),
                question_reviews=json.dumps(evals_with_qa, ensure_ascii=False),
                weaknesses=json.dumps(top_weak, ensure_ascii=False),
                suggestions=json.dumps(summary.get("suggestions", []), ensure_ascii=False),
                overall_comment=summary.get("overall_comment", ""),
                observer_comment="; ".join(state.get("observer_notes", [])) if state.get("multi_agent") else None,
                share_token=share_token,
            )
            db.add(report)
            # 更新面试状态
            interview = await db.get(Interview, state["interview_id"])
            if interview:
                interview.status = "completed"
                interview.total_score = total_score
                interview.question_count = len(evals)
                interview.ended_at = datetime.now(timezone.utc)
            await db.commit()
    except Exception as e:
        print(f"保存报告失败: {e}")

    # 推送结束事件
    await manager.send_personal(state["interview_id"], {
        "type": "server:interview_ended",
        "data": {"interview_id": state["interview_id"], "reason": "completed", "report_id": report_id},
    })
    await manager.send_personal(state["interview_id"], {
        "type": "server:report_ready",
        "data": {"report_id": report_id, "total_score": total_score},
    })

    return {"phase": "summary", "total_score": total_score}
