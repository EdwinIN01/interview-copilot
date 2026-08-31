import json
import uuid
from fastapi import WebSocket
from app.ws.connection_manager import manager
from app.agent.manager import agent_manager
from app.core.security import decode_access_token
from app.db.session import async_session
from app.db.models.interview import Interview
from app.db.models.resume import Resume
from app.db.models.message import Message
from sqlalchemy import select


async def websocket_endpoint(websocket: WebSocket, interview_id: str):
    """WebSocket 端点：实时面试通信"""
    # 1. 验证 token
    token = websocket.query_params.get("token", "")
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")

    # 2. 验证面试归属
    async with async_session() as db:
        interview = await db.get(Interview, interview_id)
        if not interview or interview.user_id != user_id:
            await websocket.close(code=4003, reason="Interview not found")
            return

    # 3. 接受连接
    await manager.connect(interview_id, websocket)

    # 4. 发送连接成功
    await manager.send_personal(interview_id, {
        "type": "server:connected",
        "data": {"interview_id": interview_id, "status": "in_progress"},
    })

    # 5. 启动 Agent（如果还没启动）
    if not agent_manager.is_started(interview_id):
        try:
            print(f"启动 Agent: {interview_id}")
            async with async_session() as db:
                interview = await db.get(Interview, interview_id)
                resume = await db.get(Resume, interview.resume_id)
                if interview and resume:
                    thread_id = str(uuid.uuid4())
                    await agent_manager.start_interview(interview, resume, thread_id)
        except Exception as e:
            print(f"启动 Agent 失败: {e}")

    # 5. 消息循环
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                msg_type = msg.get("type", "")
                data = msg.get("data", {})
            except Exception:
                continue

            # 路由消息
            if msg_type == "client:answer":
                answer = data.get("content", "")
                if answer:
                    # 保存消息
                    await _save_message(interview_id, "user", "answer", answer)
                    # 恢复 Agent
                    await agent_manager.submit_answer(interview_id, answer)

            elif msg_type == "client:followup_answer":
                answer = data.get("content", "")
                if answer:
                    await _save_message(interview_id, "user", "followup_answer", answer)
                    await agent_manager.submit_answer(interview_id, answer)

            elif msg_type == "client:code_submit":
                code = data.get("code", "")
                if code:
                    await _save_message(interview_id, "user", "code_submit", code)
                    await agent_manager.submit_answer(interview_id, code)

            elif msg_type == "client:end_interview":
                await agent_manager.end_interview(interview_id)
                break

            elif msg_type == "ping":
                await manager.send_personal(interview_id, {"type": "pong", "data": {}})

            elif msg_type == "client:typing":
                # 可选：广播给其他端（单人面试不需要）
                pass

    except Exception as e:
        print(f"WebSocket 错误: {e}")
    finally:
        manager.disconnect(interview_id)


async def _save_message(interview_id: str, role: str, msg_type: str, content: str):
    """保存消息到数据库"""
    try:
        async with async_session() as db:
            msg = Message(interview_id=interview_id, role=role, type=msg_type, content=content)
            db.add(msg)
            await db.commit()
    except Exception as e:
        print(f"保存消息失败: {e}")
