import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.exceptions import add_exception_handlers
from app.api import auth, user, resume, interview, knowledge
from app.ws.handler import websocket_endpoint


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    from app.db.session import init_db
    await init_db()
    # 确保上传目录存在
    os.makedirs("data/uploads", exist_ok=True)
    os.makedirs("data/kb_uploads", exist_ok=True)
    yield


app = FastAPI(
    title="Interview Copilot API",
    description="AI 面试模拟助手后端 API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 异常处理
add_exception_handlers(app)

# REST API 路由
app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(user.router, prefix="/api/v1/users", tags=["用户"])
app.include_router(resume.router, prefix="/api/v1/resumes", tags=["简历"])
app.include_router(interview.router, prefix="/api/v1/interviews", tags=["面试"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge-bases", tags=["知识库"])

# WebSocket 路由
app.add_api_websocket_route("/ws/interview/{interview_id}", websocket_endpoint)


# 健康检查
@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0", "env": settings.APP_ENV}
