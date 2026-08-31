import json
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from tenacity import retry, stop_after_attempt, wait_exponential


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
async def evaluate_node(state: InterviewState) -> InterviewState:
    """评估节点：对用户回答进行多维度评分"""
    current_question = state["current_question"]
    user_answer = state.get("user_answer", "")
    is_intro = state.get("current_question_type") == "intro"
    is_code = state.get("current_question_type") == "code"

    if is_intro:
        # 自我介绍：用宽松标准，不评估技术深度
        prompt = f"""你是一位友好的{state['role_category']}面试官，请对候选人的自我介绍进行简单评价。

候选人自我介绍：{user_answer}

请输出JSON格式：
{{"expression": 0-10, "comment": "30-50字鼓励性点评", "weak_points": []}}

只输出JSON，不要其他内容。"""
        llm = get_llm("evaluate")
        response = await llm.ainvoke(prompt)
        try:
            eval_data = json.loads(response.content)
        except Exception:
            eval_data = {"expression": 7.0, "comment": "自我介绍清晰，继续加油！", "weak_points": []}

        overall = float(eval_data.get("expression", 7.0))
        eval_dict = {
            "question_num": state["current_question_num"],
            "tech_depth": 0,
            "expression": float(eval_data.get("expression", 7.0)),
            "adaptability": 0,
            "foundation": 0,
            "overall_score": round(overall, 1),
            "comment": eval_data.get("comment", ""),
            "suggested_answer": "",
            "followup_count": 99,  # 标记为不追问
            "weak_points": [],
            "is_intro": True,
        }
    elif is_code:
        # 代码题：评估正确性、复杂度、边界条件、代码风格
        prompt = f"""你是一位严格的{state['role_category']}面试官，请评审候选人的代码。

题目：{current_question}
候选人代码：
{user_answer}

评分维度（每项0-10分）：
1. 技术深度(35%)：算法正确性、时间/空间复杂度
2. 表达逻辑(25%)：代码可读性、命名、结构
3. 应变能力(20%)：边界条件处理
4. 基础知识(20%)：语法、数据结构使用

请输出JSON格式：
{{"tech_depth": 0-10, "expression": 0-10, "adaptability": 0-10, "foundation": 0-10, "comment": "50-100字代码评审", "suggested_answer": "优化思路或参考解法", "weak_points": ["问题1"]}}

只输出JSON，不要其他内容。"""

        llm = get_llm("evaluate")
        response = await llm.ainvoke(prompt)

        try:
            eval_data = json.loads(response.content)
        except Exception:
            eval_data = {
                "tech_depth": 6.0, "expression": 6.0, "adaptability": 6.0, "foundation": 6.0,
                "comment": "代码基本正确，可以进一步优化。", "suggested_answer": "建议考虑边界条件和时间复杂度优化。",
                "weak_points": ["边界条件处理"],
            }

        overall = (
            float(eval_data["tech_depth"]) * 0.35
            + float(eval_data["expression"]) * 0.25
            + float(eval_data["adaptability"]) * 0.20
            + float(eval_data["foundation"]) * 0.20
        )

        eval_dict = {
            "question_num": state["current_question_num"],
            "tech_depth": float(eval_data["tech_depth"]),
            "expression": float(eval_data["expression"]),
            "adaptability": float(eval_data["adaptability"]),
            "foundation": float(eval_data["foundation"]),
            "overall_score": round(overall, 1),
            "comment": eval_data.get("comment", ""),
            "suggested_answer": eval_data.get("suggested_answer", ""),
            "followup_count": state["followup_count"],
            "weak_points": eval_data.get("weak_points", []),
            "is_intro": False,
        }
    else:
        prompt = f"""你是一位严格的{state['role_category']}面试官，请对候选人的回答进行评分。

问题：{current_question}
候选人回答：{user_answer}

评分维度（每项0-10分）：
1. 技术深度(35%)：对技术原理的理解深度
2. 表达逻辑(25%)：回答结构和语言表达
3. 应变能力(20%)：应对不熟悉问题的表现
4. 基础知识(20%)：基础概念准确性

请输出JSON格式：
{{"tech_depth": 0-10, "expression": 0-10, "adaptability": 0-10, "foundation": 0-10, "comment": "50-100字点评", "suggested_answer": "示范回答", "weak_points": ["薄弱点1"]}}

只输出JSON，不要其他内容。"""

        llm = get_llm("evaluate")
        response = await llm.ainvoke(prompt)

        try:
            eval_data = json.loads(response.content)
        except Exception:
            eval_data = {
                "tech_depth": 6.0, "expression": 6.0, "adaptability": 6.0, "foundation": 6.0,
                "comment": "回答基本正确，可以进一步加强。", "suggested_answer": "建议从原理、实践和案例三个方面回答。",
                "weak_points": ["表达可以更清晰"],
            }

        overall = (
            float(eval_data["tech_depth"]) * 0.35
            + float(eval_data["expression"]) * 0.25
            + float(eval_data["adaptability"]) * 0.20
            + float(eval_data["foundation"]) * 0.20
        )

        eval_dict = {
            "question_num": state["current_question_num"],
            "tech_depth": float(eval_data["tech_depth"]),
            "expression": float(eval_data["expression"]),
            "adaptability": float(eval_data["adaptability"]),
            "foundation": float(eval_data["foundation"]),
            "overall_score": round(overall, 1),
            "comment": eval_data.get("comment", ""),
            "suggested_answer": eval_data.get("suggested_answer", ""),
            "followup_count": state["followup_count"],
            "weak_points": eval_data.get("weak_points", []),
            "is_intro": False,
        }

    # 推送评估结果给前端
    try:
        from app.ws.connection_manager import manager
        await manager.send_personal(state["interview_id"], {
            "type": "server:evaluation",
            "data": eval_dict,
        })
    except Exception as e:
        print(f"推送评估结果失败: {e}")

    # 异步保存到数据库
    import asyncio
    asyncio.create_task(_save_evaluation(state["interview_id"], eval_dict))

    # 等待3秒，让用户看完评分再出下一题
    await asyncio.sleep(3)

    return {
        "evaluations": state["evaluations"] + [eval_dict],
        "user_answer": None,
    }


async def _save_evaluation(interview_id: str, eval_dict: dict):
    """保存评估到数据库"""
    try:
        from app.db.session import async_session
        from app.db.models.evaluation import Evaluation
        import json as _json
        async with async_session() as db:
            ev = Evaluation(
                interview_id=interview_id,
                question_num=eval_dict["question_num"],
                tech_depth=eval_dict["tech_depth"],
                expression=eval_dict["expression"],
                adaptability=eval_dict["adaptability"],
                foundation=eval_dict["foundation"],
                overall_score=eval_dict["overall_score"],
                comment=eval_dict["comment"],
                suggested_answer=eval_dict["suggested_answer"],
                followup_count=eval_dict["followup_count"],
                weak_points=_json.dumps(eval_dict["weak_points"], ensure_ascii=False),
            )
            db.add(ev)
            await db.commit()
    except Exception as e:
        print(f"保存评估失败: {e}")
