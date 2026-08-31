from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.interview import Interview
from app.db.models.resume import Resume
from app.db.models.message import Message
from app.db.models.evaluation import Evaluation
from app.db.models.report import Report
from app.core.dependencies import get_current_user
from app.schemas.interview import InterviewCreate, InterviewOut, InterviewStartResponse, ReportOut
from app.schemas.common import ApiResponse
from app.agent.manager import agent_manager
from datetime import datetime, timezone
import json

router = APIRouter()


@router.post("", response_model=ApiResponse[InterviewOut])
async def create_interview(
    data: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 验证简历归属
    resume = await db.get(Resume, data.resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="简历不存在")

    interview = Interview(
        user_id=current_user.id,
        resume_id=data.resume_id,
        kb_id=data.kb_id,
        role_category=data.role_category,
        difficulty=data.difficulty,
        duration_minutes=data.duration_minutes,
        personality=data.personality,
        voice_enabled=data.voice_enabled,
        code_enabled=data.code_enabled,
        multi_agent=data.multi_agent,
        status="created",
    )
    db.add(interview)
    await db.flush()
    return ApiResponse(data=InterviewOut.model_validate(interview))


@router.get("", response_model=ApiResponse[dict])
async def list_interviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role_category: str = None,
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Interview).where(Interview.user_id == current_user.id)
    count_query = select(func.count()).select_from(Interview).where(Interview.user_id == current_user.id)
    if role_category:
        query = query.where(Interview.role_category == role_category)
        count_query = count_query.where(Interview.role_category == role_category)
    if status:
        query = query.where(Interview.status == status)
        count_query = count_query.where(Interview.status == status)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Interview.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    interviews = result.scalars().all()
    return ApiResponse(data={
        "items": [InterviewOut.model_validate(i).model_dump() for i in interviews],
        "total": total, "page": page, "page_size": page_size,
    })


@router.get("/{interview_id}", response_model=ApiResponse[InterviewOut])
async def get_interview(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")
    return ApiResponse(data=InterviewOut.model_validate(interview))


@router.post("/{interview_id}/start", response_model=ApiResponse[InterviewStartResponse])
async def start_interview(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")
    if interview.status not in ("created",):
        raise HTTPException(status_code=400, detail="面试已开始或已结束")

    interview.status = "in_progress"
    interview.started_at = datetime.now(timezone.utc)
    await db.flush()

    # 创建 LangGraph 线程（Agent 在 WebSocket 连接时启动，避免竞态条件）
    thread_id = agent_manager.create_thread(interview_id)

    ws_url = f"/ws/interview/{interview_id}"
    return ApiResponse(data=InterviewStartResponse(
        interview_id=interview_id, status="in_progress", ws_url=ws_url, thread_id=thread_id,
    ))


@router.post("/{interview_id}/end")
async def end_interview(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")
    # 触发 Agent 总结
    await agent_manager.end_interview(interview_id)
    return ApiResponse(message="面试结束，正在生成报告")


@router.get("/{interview_id}/messages")
async def get_messages(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")
    result = await db.execute(select(Message).where(Message.interview_id == interview_id).order_by(Message.created_at))
    messages = result.scalars().all()
    return ApiResponse(data=[{"role": m.role, "type": m.type, "content": m.content, "question_num": m.question_num, "created_at": m.created_at.isoformat()} for m in messages])


@router.get("/{interview_id}/report", response_model=ApiResponse[ReportOut])
async def get_report(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")
    result = await db.execute(select(Report).where(Report.interview_id == interview_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="报告尚未生成")
    # 先解析 JSON 字段，再验证
    data = {
        "id": report.id,
        "interview_id": report.interview_id,
        "total_score": float(report.total_score) if report.total_score else 0,
        "dimension_scores": json.loads(report.dimension_scores) if report.dimension_scores else {},
        "question_reviews": json.loads(report.question_reviews) if report.question_reviews else [],
        "weaknesses": json.loads(report.weaknesses) if report.weaknesses else [],
        "suggestions": json.loads(report.suggestions) if report.suggestions else [],
        "overall_comment": report.overall_comment or "",
        "observer_comment": report.observer_comment,
        "share_token": report.share_token,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
    return ApiResponse(data=data)


@router.post("/{interview_id}/regenerate-report")
async def regenerate_report(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """根据已有的评估数据重新生成面试报告"""
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")

    # 获取所有评估数据
    result = await db.execute(select(Evaluation).where(Evaluation.interview_id == interview_id).order_by(Evaluation.question_num))
    evals = result.scalars().all()

    if not evals:
        raise HTTPException(status_code=400, detail="没有评估数据，无法生成报告")

    # 计算分数（Decimal 转 float）
    avg_tech = sum(float(e.tech_depth) for e in evals) / len(evals)
    avg_expr = sum(float(e.expression) for e in evals) / len(evals)
    avg_adapt = sum(float(e.adaptability) for e in evals) / len(evals)
    avg_found = sum(float(e.foundation) for e in evals) / len(evals)
    total_score = round(avg_tech * 0.35 + avg_expr * 0.25 + avg_adapt * 0.20 + avg_found * 0.20, 1)

    # 薄弱点分析
    from collections import Counter
    all_weak = []
    for e in evals:
        if e.weak_points:
            try:
                all_weak.extend(json.loads(e.weak_points))
            except Exception:
                pass
    weak_counter = Counter(all_weak)
    top_weak = [{"point": w, "frequency": c} for w, c in weak_counter.most_common(5)]

    # LLM 生成整体评价
    from app.agent.llm import get_llm
    prompt = f"""你是一位{interview.role_category}面试官，面试已结束。请给出整体评价。

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

    # 删除旧报告（如果有）
    from sqlalchemy import delete
    await db.execute(delete(Report).where(Report.interview_id == interview_id))

    # 保存新报告
    import uuid
    from datetime import datetime, timezone
    report_id = str(uuid.uuid4())
    # 从数据库读取消息，提取问题和回答
    from app.db.models.message import Message
    msg_result = await db.execute(select(Message).where(Message.interview_id == interview_id).order_by(Message.created_at))
    messages = msg_result.scalars().all()
    question_map = {}
    answer_map = {}
    for msg in messages:
        try:
            meta = json.loads(msg.metadata) if msg.metadata else {}
        except Exception:
            meta = {}
        q_num = meta.get("question_num")
        if q_num:
            if msg.role == "ai" and meta.get("type") in ("question", "code_question"):
                question_map[q_num] = msg.content
            elif msg.role == "user":
                answer_map[q_num] = msg.content

    report = Report(
        id=report_id,
        interview_id=interview_id,
        total_score=total_score,
        dimension_scores=json.dumps({"tech_depth": round(avg_tech, 1), "expression": round(avg_expr, 1), "adaptability": round(avg_adapt, 1), "foundation": round(avg_found, 1)}, ensure_ascii=False),
        question_reviews=json.dumps([{
            "question_num": e.question_num,
            "question": question_map.get(e.question_num, ""),
            "answer": answer_map.get(e.question_num, ""),
            "tech_depth": float(e.tech_depth),
            "expression": float(e.expression),
            "adaptability": float(e.adaptability),
            "foundation": float(e.foundation),
            "overall_score": float(e.overall_score),
            "comment": e.comment,
            "weak_points": json.loads(e.weak_points) if e.weak_points else [],
        } for e in evals], ensure_ascii=False),
        weaknesses=json.dumps(top_weak, ensure_ascii=False),
        suggestions=json.dumps(summary.get("suggestions", []), ensure_ascii=False),
        overall_comment=summary.get("overall_comment", ""),
        share_token=uuid.uuid4().hex[:32],
    )
    db.add(report)

    # 更新面试状态
    interview.status = "completed"
    interview.total_score = total_score
    interview.question_count = len(evals)
    interview.ended_at = datetime.now(timezone.utc)
    await db.commit()

    return ApiResponse(data={"report_id": report_id, "total_score": total_score}, message="报告生成成功")


@router.delete("/{interview_id}")
async def delete_interview(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """删除面试及其关联的消息、评估、报告"""
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")

    # 级联删除关联数据
    from sqlalchemy import delete
    await db.execute(delete(Message).where(Message.interview_id == interview_id))
    await db.execute(delete(Evaluation).where(Evaluation.interview_id == interview_id))
    await db.execute(delete(Report).where(Report.interview_id == interview_id))
    await db.delete(interview)
    await db.commit()

    # 清理 Agent 状态
    agent_manager._started.discard(interview_id)
    agent_manager.threads.pop(interview_id, None)

    return ApiResponse(message="删除成功")


@router.post("/{interview_id}/share")
async def create_share_link(interview_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """生成或获取报告分享链接"""
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")

    result = await db.execute(select(Report).where(Report.interview_id == interview_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="报告尚未生成")

    # 如果没有 share_token，生成一个
    if not report.share_token:
        import uuid
        report.share_token = uuid.uuid4().hex[:32]
        await db.commit()

    return ApiResponse(data={
        "share_token": report.share_token,
        "share_url": f"/share/{report.share_token}",
    })


@router.get("/share/{token}")
async def get_shared_report(token: str, db: AsyncSession = Depends(get_db)):
    """公开接口：通过分享 token 查看报告（不需要登录）"""
    result = await db.execute(select(Report).where(Report.share_token == token))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="分享链接无效或已过期")

    # 获取面试基本信息（岗位、难度等）
    interview = await db.get(Interview, report.interview_id)

    # 解析 JSON 字段
    data = {
        "id": report.id,
        "interview_id": report.interview_id,
        "total_score": float(report.total_score) if report.total_score else 0,
        "dimension_scores": json.loads(report.dimension_scores) if report.dimension_scores else {},
        "question_reviews": json.loads(report.question_reviews) if report.question_reviews else [],
        "weaknesses": json.loads(report.weaknesses) if report.weaknesses else [],
        "suggestions": json.loads(report.suggestions) if report.suggestions else [],
        "overall_comment": report.overall_comment or "",
        "role_category": interview.role_category if interview else "",
        "difficulty": interview.difficulty if interview else "",
        "duration_minutes": interview.duration_minutes if interview else 0,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
    return ApiResponse(data=data)


@router.put("/{interview_id}/code")
async def save_code(
    interview_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """保存代码编辑器内容"""
    interview = await db.get(Interview, interview_id)
    if not interview or interview.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="面试不存在")

    interview.code_content = data.get("code_content", "")
    interview.code_language = data.get("code_language", "python")
    await db.commit()

    return ApiResponse(message="代码保存成功")
