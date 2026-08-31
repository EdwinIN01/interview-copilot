# Interview Copilot — 项目实施文档（Python 版）

> 版本：v2.0（Python 后端 + React 前端）
> 日期：2026-08-30
> 配套文档：《Interview Copilot PRD v1.0》
> 开发周期：2 周（14 天）
> 技术方案：FastAPI + LangGraph(Python) + PostgreSQL + React 19

---

## 目录

1. [技术选型与架构总览](#1-技术选型与架构总览)
2. [项目结构与工程规范](#2-项目结构与工程规范)
3. [数据库设计](#3-数据库设计)
4. [API 接口设计](#4-api-接口设计)
5. [WebSocket 协议设计（关键）](#5-websocket-协议设计关键)
6. [LangGraph 面试 Agent 详细设计（核心关键）](#6-langgraph-面试-agent-详细设计核心关键)
7. [RAG 知识库设计](#7-rag-知识库设计)
8. [前端架构设计](#8-前端架构设计)
9. [语音模块设计](#9-语音模块设计)
10. [代码面试模块设计](#10-代码面试模块设计)
11. [多 Agent 模式设计](#11-多-agent-模式设计)
12. [开发计划（14 天）](#12-开发计划14-天)
13. [部署方案](#13-部署方案)
14. [风险识别与应对](#14-风险识别与应对)
15. [质量保障](#15-质量保障)
16. [Vibe Coding 执行策略](#16-vibe-coding-执行策略)

---

## 1. 技术选型与架构总览

### 1.1 技术选型

| 层级 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| **前端框架** | React | 19.x | 生态最成熟，AI 生成代码质量最高 |
| **前端语言** | TypeScript | 5.x | 类型安全，减少运行时错误 |
| **构建工具** | Vite | 5.x | 开发体验好，HMR 快 |
| **样式方案** | Tailwind CSS | 4.x | 原子化 CSS，AI 生成 UI 效率最高 |
| **状态管理** | Zustand | 4.x | 轻量，API 简单，AI 容易理解 |
| **UI 组件** | shadcn/ui + Radix | - | 可定制，与 Tailwind 配合 |
| **图表** | Recharts | 2.x | React 生态最好用的图表库 |
| **后端框架** | **FastAPI** | 0.115.x | ⭐ 异步高性能、原生 WebSocket 支持、自动生成 OpenAPI 文档、Pydantic 类型校验、AI 生成质量高 |
| **ASGI 服务器** | Uvicorn | 0.30.x | FastAPI 官方推荐，支持标准模式 |
| **Agent 编排** | **LangGraph (Python)** | 0.2.x | ⭐⭐ **Python 是 LangGraph 原生语言**，生态最成熟、文档最全、支持 Checkpoint/时间旅行/子图等高级特性 |
| **LLM 抽象** | **LangChain (Python)** | 0.3.x | ⭐ 模型抽象、Prompt 模板、输出解析器、文档加载器，Python 版生态最丰富 |
| **LLM 提供商** | DeepSeek API / Claude API | - | DeepSeek 性价比高中文好；Claude 质量高长上下文 |
| **Embedding** | DeepSeek embedding / bge-large-zh | - | 中文向量效果好 |
| **ORM** | **SQLAlchemy 2.0 (async)** | 2.0.x | ⭐ Python 最成熟的 ORM，异步支持好，类型安全，迁移用 Alembic |
| **数据库驱动** | asyncpg | 0.29.x | PostgreSQL 异步驱动，性能好 |
| **向量扩展** | pgvector | 0.3.x | PostgreSQL 向量扩展，关系型+向量一体化 |
| **数据库迁移** | Alembic | 1.13.x | SQLAlchemy 官方迁移工具 |
| **缓存/会话** | Redis | 7.x | 面试会话状态缓存、WebSocket 房间状态、限流 |
| **认证** | PyJWT + bcrypt | - | JWT 无状态认证，bcrypt 密码加密 |
| **数据校验** | Pydantic v2 | 2.9.x | FastAPI 原生支持，请求/响应模型、LLM 输出校验都用它 |
| **PDF 解析** | pdfplumber | 0.11.x | 比 pdf-parse 更强的 Python PDF 解析，支持表格提取 |
| **DOCX 解析** | python-docx | 1.1.x | Word 文档解析 |
| **语音 STT** | OpenAI Whisper API / 阿里云 | - | Whisper 多语言准确率高 |
| **语音 TTS** | Edge TTS (免费) / OpenAI TTS | - | Edge TTS 免费够用 |
| **代码编辑** | Monaco Editor | 0.45.x | VS Code 同款，@monaco-editor/react |
| **包管理（前端）** | pnpm | 10.x | 速度快，磁盘省 |
| **包管理（后端）** | uv 或 pip | - | uv 是现代 Python 包管理器，速度极快；也可用 pip + requirements.txt |
| **容器化** | Docker + docker-compose | - | 前后端+数据库统一编排 |
| **部署平台** | Railway / Render | - | 一键部署，支持 Docker，免费额度 |

### 1.2 为什么选 Python 后端（关键决策）

| 维度 | 说明 |
|---|---|
| **LangGraph 原生支持** | LangGraph 是 Python 优先的项目，JS 版是后来移植的。Python 版支持 Checkpoint（状态自动持久化）、时间旅行、子图、人机协同（interrupt）等高级特性，JS 版很多功能不完善 |
| **AI/ML 生态** | LangChain、LlamaIndex、各种 embedding 模型、文档加载器、文本分割器，全都是 Python 版最完善 |
| **开发效率** | 你是算法方向，Python 天天用，上手快，面试时讲底层实现更自信 |
| **RAG 质量** | Python 的 RAG 生态最丰富，分块策略、检索方式、重排序模型选择多 |
| **Checkpoint 断线重连** | LangGraph Python 版的 Checkpoint 功能可以自动持久化面试状态，断线重连时直接恢复，不用自己写 Redis 序列化逻辑 |

### 1.3 系统架构图

```
                        ┌─────────────────┐
                        │   客户端 (浏览器)  │
                        │  React 19 + Vite │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  HTTPS (REST API)        │  WebSocket (WSS)
                    │                         │
              ┌─────▼─────┐           ┌──────▼──────┐
              │ FastAPI    │           │ FastAPI WS   │
              │ REST API   │           │ 实时面试      │
              └─────┬─────┘           └──────┬──────┘
                    │                         │
              ┌─────▼─────────────────────────▼─────┐
              │         服务层 (FastAPI + Uvicorn)    │
              │                                         │
              │  ┌──────────────┐  ┌────────────────┐ │
              │  │ 认证/用户/简历 │  │ LangGraph Agent│ │
              │  │ 报告/统计/KB  │  │ (Python 状态机) │ │
              │  └──────────────┘  └────────┬───────┘ │
              │                               │         │
              │  ┌──────────────┐  ┌─────────▼───────┐ │
              │  │ RAG 检索      │  │  LLM 调用层      │ │
              │  │ (LangChain +  │  │ LangChain +     │ │
              │  │  pgvector)    │  │ DeepSeek/Claude │ │
              │  └──────────────┘  └─────────────────┘ │
              └─────┬──────────────────┬──────────────┘
                    │                  │
              ┌─────▼─────┐    ┌──────▼──────┐
              │ PostgreSQL │    │    Redis     │
              │ + pgvector │    │ (会话/缓存)   │
              └───────────┘    └─────────────┘
                    │
              ┌─────▼─────┐
              │  文件存储   │
              │ (简历/PDF) │
              └───────────┘
```

### 1.4 架构决策记录（ADR）

| 编号 | 决策 | 备选方案 | 决策理由 |
|---|---|---|---|
| ADR-001 | **后端用 Python (FastAPI) 而非 Node.js** | Node.js + Hono | LangGraph Python 版是原生版本，生态最成熟；AI/ML/RAG 生态 Python 最强；开发者熟悉 Python |
| ADR-002 | **用 LangGraph 做面试流程编排** | 直接链式调用 LLM / 手写状态机 | 面试是有状态多轮流程，需要条件分支（追问/换题/总结），LangGraph 状态机+条件边+Checkpoint 天然适配 |
| ADR-003 | **用 PostgreSQL + pgvector 而非独立向量数据库** | Pinecone / Milvus / Chroma | 减少运维组件，关系型+向量一体化，MVP 阶段数据量小 pgvector 性能够用 |
| ADR-004 | **用 SQLAlchemy 2.0 async 而非 Prisma/Django ORM** | Prisma Client Python / Django ORM / Tortoise ORM | SQLAlchemy 是 Python 最成熟的 ORM，2.0 异步支持好，类型安全，Alembic 迁移工具完善；Django 太重不适合 API 服务 |
| ADR-005 | **用 FastAPI 而非 Flask/Django** | Flask / Django / Starlette | FastAPI 异步高性能、原生 WebSocket、自动 OpenAPI 文档、Pydantic 校验、AI 生成代码质量高；Flask 异步支持弱；Django 太重 |
| ADR-006 | **用 WebSocket 而非 SSE 做面试实时通信** | SSE + REST 轮询 | 面试需要双向实时通信，WebSocket 全双工更适合 |
| ADR-007 | **前后端分离而非模板渲染** | Jinja2 模板 | 前端 React 交互复杂，分离开发效率高，可独立部署 |
| ADR-008 | **LLM 抽象层支持多提供商切换** | 固定一家 | 不同场景用不同模型（提问用 DeepSeek 省钱，评分用 Claude 质量高），避免供应商锁定 |
| ADR-009 | **用 LangChain 的 PydanticOutputParser 做 LLM 输出校验** | 正则匹配 / 手动 JSON 解析 | Pydantic 类型安全，校验失败自动重试，与 FastAPI 生态一致 |

---

## 2. 项目结构与工程规范

### 2.1 目录结构

```
ai面试助手/
├── frontend/                          # 前端：React SPA
│   ├── src/
│   │   ├── main.tsx                   # 入口
│   │   ├── App.tsx                    # 路由
│   │   ├── components/                # 通用组件
│   │   │   ├── ui/                    # shadcn/ui 组件
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx          # 首页/数据看板
│   │   │   ├── Resume.tsx             # 简历管理
│   │   │   ├── CreateInterview.tsx    # 创建面试
│   │   │   ├── InterviewRoom.tsx      # 面试房间（核心）
│   │   │   ├── Report.tsx             # 报告页
│   │   │   ├── History.tsx            # 历史记录
│   │   │   └── Knowledge.tsx          # 知识库管理
│   │   ├── interview/                 # 面试房间子组件
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── InputArea.tsx
│   │   │   ├── TimerBar.tsx
│   │   │   ├── CodeEditorPanel.tsx
│   │   │   └── VoiceControl.tsx
│   │   ├── report/
│   │   │   ├── ScoreOverview.tsx
│   │   │   ├── RadarChart.tsx
│   │   │   ├── QuestionReview.tsx
│   │   │   ├── WeaknessAnalysis.tsx
│   │   │   └── Suggestions.tsx
│   │   ├── stores/                    # Zustand stores
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useInterviewStore.ts
│   │   │   └── useUIStore.ts
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useVoice.ts
│   │   │   └── useAuth.ts
│   │   ├── lib/
│   │   │   ├── api.ts                 # REST API 客户端（axios / fetch）
│   │   │   ├── wsClient.ts            # WebSocket 客户端
│   │   │   ├── types.ts               # 前端类型（从后端 OpenAPI 生成或手动维护）
│   │   │   └── constants.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # Python 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI 应用入口，注册路由 + WebSocket
│   │   ├── config.py                  # 配置管理（pydantic-settings，读取 .env）
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── security.py            # JWT 签发/验证、密码加密
│   │   │   ├── dependencies.py        # FastAPI 依赖注入（当前用户、DB 会话等）
│   │   │   └── exceptions.py          # 全局异常处理
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # SQLAlchemy 基础模型类
│   │   │   ├── session.py             # 异步数据库连接 + 会话管理
│   │   │   ├── models/                # SQLAlchemy ORM 模型
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py
│   │   │   │   ├── resume.py
│   │   │   │   ├── knowledge.py
│   │   │   │   ├── interview.py
│   │   │   │   ├── message.py
│   │   │   │   ├── evaluation.py
│   │   │   │   ├── report.py
│   │   │   │   └── stats.py
│   │   │   └── repositories/          # 数据访问层（每个模型一个 repository）
│   │   │       ├── __init__.py
│   │   │       ├── user_repo.py
│   │   │       ├── resume_repo.py
│   │   │       ├── interview_repo.py
│   │   │       ├── message_repo.py
│   │   │       ├── report_repo.py
│   │   │       └── knowledge_repo.py
│   │   ├── redis/
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # Redis 异步连接
│   │   │   └── session_store.py       # 面试会话缓存
│   │   ├── api/                       # REST API 路由
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                # API 通用依赖
│   │   │   ├── auth.py                # 注册/登录
│   │   │   ├── user.py                # 用户资料
│   │   │   ├── resume.py              # 简历上传/解析
│   │   │   ├── interview.py           # 面试 CRUD
│   │   │   ├── report.py              # 报告
│   │   │   ├── history.py             # 历史记录
│   │   │   └── knowledge.py           # 知识库
│   │   ├── schemas/                   # Pydantic 请求/响应模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── resume.py
│   │   │   ├── interview.py
│   │   │   ├── report.py
│   │   │   ├── knowledge.py
│   │   │   └── common.py              # 通用响应包装、分页模型
│   │   ├── ws/                        # WebSocket
│   │   │   ├── __init__.py
│   │   │   ├── handler.py             # WebSocket 连接处理（FastAPI WebSocket）
│   │   │   ├── router.py              # 消息路由（根据事件类型分发）
│   │   │   ├── connection_manager.py  # 连接管理（活跃连接、房间映射）
│   │   │   └── protocol.py            # WebSocket 事件类型定义（Python 端）
│   │   ├── agent/                     # ⭐ LangGraph 面试 Agent（核心）
│   │   │   ├── __init__.py
│   │   │   ├── graph.py               # 状态图定义（StateGraph + 条件边 + compile）
│   │   │   ├── state.py               # 状态定义（TypedDict / Annotated）
│   │   │   ├── checkpoint.py          # Checkpoint 配置（状态持久化）
│   │   │   ├── manager.py             # Agent 管理器（启动、恢复、发送消息、流式输出）
│   │   │   ├── llm.py                 # LLM 调用封装（LangChain，多提供商）
│   │   │   ├── nodes/                 # 8 个节点
│   │   │   │   ├── __init__.py
│   │   │   │   ├── opening.py         # 开场节点
│   │   │   │   ├── question.py        # 提问节点
│   │   │   │   ├── evaluate.py        # 评估节点
│   │   │   │   ├── followup.py        # 追问节点
│   │   │   │   ├── code_question.py   # 代码题节点
│   │   │   │   ├── reverse.py         # 反问节点
│   │   │   │   └── summary.py         # 总结节点
│   │   │   └── prompts/               # Prompt 模板（LangChain PromptTemplate）
│   │   │       ├── __init__.py
│   │   │       ├── opening.py
│   │   │       ├── question.py
│   │   │       ├── evaluate.py
│   │   │       ├── followup.py
│   │   │       ├── code_question.py
│   │   │       ├── reverse.py
│   │   │       └── summary.py
│   │   ├── rag/                       # RAG 知识库
│   │   │   ├── __init__.py
│   │   │   ├── ingest.py              # 文档摄入/向量化（LangChain Document + text_splitter）
│   │   │   ├── retrieve.py            # 检索（LangChain Retriever + 混合检索）
│   │   │   ├── chunker.py             # 文本分块（语义分块）
│   │   │   ├── embedding.py           # Embedding 封装（LangChain Embeddings）
│   │   │   └── vector_store.py        # pgvector 向量存储封装
│   │   ├── services/                  # 业务服务层
│   │   │   ├── __init__.py
│   │   │   ├── interview_service.py   # 面试业务逻辑
│   │   │   ├── report_service.py      # 报告生成
│   │   │   ├── resume_service.py      # 简历解析
│   │   │   ├── stats_service.py       # 统计分析
│   │   │   └── knowledge_service.py   # 知识库业务
│   │   ├── voice/                     # 语音模块（进阶）
│   │   │   ├── __init__.py
│   │   │   ├── stt.py                 # 语音转文字（Whisper API）
│   │   │   ├── tts.py                 # 文字转语音（Edge TTS / OpenAI TTS）
│   │   │   └── audio_utils.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── logger.py              # 日志配置
│   │       ├── datetime.py            # 时间工具
│   │       └── file_storage.py        # 文件存储
│   ├── alembic/                       # 数据库迁移
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── tests/                         # 测试
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_agent_graph.py       # LangGraph 图测试
│   │   ├── test_agent_nodes.py       # 节点单元测试
│   │   └── test_rag.py
│   ├── data/                          # 运行时数据（上传文件、临时文件）
│   │   └── uploads/
│   ├── .env.example                   # 环境变量示例
│   ├── .env                           # 实际环境变量（不提交）
│   ├── pyproject.toml                 # 项目配置（uv / poetry）或 requirements.txt
│   ├── requirements.txt               # 依赖清单（pip 方式）
│   ├── alembic.ini                    # Alembic 配置
│   ├── Dockerfile                     # 后端 Docker 镜像
│   └── README.md
│
├── docs/
│   ├── api.md                         # API 文档（FastAPI 自动生成 /docs）
│   ├── ws-protocol.md                 # WebSocket 协议文档
│   └── architecture.md                # 架构文档
├── scripts/
│   ├── init_db.sql                    # 数据库初始化（pgvector 扩展等）
│   └── seed.py                        # 种子数据
├── docker-compose.yml                 # 本地开发：postgres + redis + backend + frontend
├── .gitignore
├── .dockerignore
└── README.md
```

### 2.2 后端依赖清单

```txt
# backend/requirements.txt

# Web 框架
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9          # 文件上传支持
websockets==12.0                  # WebSocket 支持（FastAPI 依赖）

# Agent & LLM
langgraph==0.2.0                  # ⭐ Agent 状态机编排
langchain==0.3.0                  # LLM 抽象
langchain-openai==0.2.0           # OpenAI/DeepSeek 兼容接口
langchain-community==0.3.0         # 社区集成（pgvector、Edge TTS 等）
langgraph-checkpoint==1.0.0        # Checkpoint 持久化
langgraph-checkpoint-postgres==1.0.0  # PostgreSQL Checkpoint（可选，也可用内存）

# 数据库
sqlalchemy[asyncio]==2.0.35        # 异步 ORM
asyncpg==0.29.0                    # PostgreSQL 异步驱动
pgvector==0.3.0                    # pgvector 向量库支持
alembic==1.13.0                    # 数据库迁移
redis==5.0.0                       # Redis 异步客户端

# 认证 & 安全
pyjwt==2.9.0                       # JWT
bcrypt==4.2.0                      # 密码加密
python-multipart==0.0.9            # 表单/文件上传

# 数据校验
pydantic==2.9.0                    # 数据模型（FastAPI 依赖）
pydantic-settings==2.5.0            # 配置管理（读取 .env）

# 文档解析
pdfplumber==0.11.0                 # PDF 解析
python-docx==1.1.0                 # DOCX 解析

# 语音
openai==1.40.0                     # Whisper STT / TTS（也用于 DeepSeek 兼容调用）
edge-tts==6.1.0                    # 免费 TTS（可选）

# 工具
python-dotenv==1.0.0               # .env 加载
loguru==0.7.2                      # 日志
httpx==0.27.0                      # 异步 HTTP 客户端（内部调用）
tenacity==8.5.0                    # 重试装饰器（LLM 调用失败重试）

# 开发 & 测试
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-cov==5.0.0
httpx==0.27.0                      # FastAPI TestClient
ruff==0.6.0                        # Lint + 格式化
black==24.8.0                      # 格式化（或用 ruff format）
mypy==1.11.0                       # 类型检查
```

### 2.3 工程规范

| 规范项 | 规则 |
|---|---|
| **Python 版本** | 3.11+（推荐 3.12） |
| **包管理** | uv（推荐）或 pip + venv；依赖写在 requirements.txt 或 pyproject.toml |
| **代码风格** | Ruff（lint + format），遵循 PEP 8，行宽 100 |
| **类型检查** | mypy 严格模式，函数必须有类型注解 |
| **命名** | 文件名 snake_case；类 PascalCase；函数/变量 snake_case；常量 UPPER_SNAKE_CASE |
| **异步** | I/O 操作全部用 async/await；数据库用 async SQLAlchemy；Redis 用 async redis |
| **导入顺序** | 标准库 → 第三方库 → 内部模块，空行分隔（isort 规则） |
| **Git 提交** | Conventional Commits：`feat: xxx` / `fix: xxx` / `chore: xxx` |
| **环境变量** | pydantic-settings 管理，`.env` 文件不提交，提供 `.env.example` |
| **配置** | 所有配置通过环境变量注入，不硬编码 |
| **前端** | TypeScript 严格模式，ESLint + Prettier，pnpm 包管理 |
| **前后端类型同步** | 后端 FastAPI 自动生成 OpenAPI，前端可用 `openapi-typescript` 生成类型，或手动维护共享类型 |

---

## 3. 数据库设计

### 3.1 ER 关系概览

```
User 1───N Resume
User 1───N KnowledgeBase 1───N KnowledgeDoc 1───N KnowledgeChunk
User 1───N Interview 1───N Message
Interview 1───1 Report
Interview 1───N Evaluation
Interview N───1 Resume
Interview N───0..1 KnowledgeBase
User 1───1 UserStats
```

### 3.2 SQLAlchemy 模型设计

#### 用户模型（user.py）

```python
# backend/app/db/models/user.py
from sqlalchemy import Column, String, Integer, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)  # UUID
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50))
    avatar_url = Column(String(500))
    target_role = Column(String(50))  # 目标岗位方向
    graduation_year = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    knowledge_bases = relationship("KnowledgeBase", back_populates="user", cascade="all, delete-orphan")
    stats = relationship("UserStats", back_populates="user", uselist=False, cascade="all, delete-orphan")
```

#### 面试模型（interview.py）

```python
# backend/app/db/models/interview.py
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Numeric, func, Text
from sqlalchemy.orm import relationship
from app.db.base import Base

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    resume_id = Column(String(36), ForeignKey("resumes.id"), nullable=False)
    kb_id = Column(String(36), ForeignKey("knowledge_bases.id"), nullable=True)

    role_category = Column(String(50), nullable=False)  # algorithm/backend/frontend/...
    difficulty = Column(String(20), nullable=False, default="medium")  # easy/medium/hard
    duration_minutes = Column(Integer, nullable=False, default=30)
    personality = Column(String(20), nullable=False, default="gentle")  # gentle/strict/pressure
    voice_enabled = Column(Boolean, nullable=False, default=False)
    code_enabled = Column(Boolean, nullable=False, default=False)
    multi_agent = Column(Boolean, nullable=False, default=False)

    status = Column(String(20), nullable=False, default="created")  # created/in_progress/completed/aborted
    total_score = Column(Numeric(4, 1))
    question_count = Column(Integer, nullable=False, default=0)

    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    user = relationship("User", back_populates="interviews")
    resume = relationship("Resume")
    knowledge_base = relationship("KnowledgeBase")
    messages = relationship("Message", back_populates="interview", cascade="all, delete-orphan", order_by="Message.created_at")
    evaluations = relationship("Evaluation", back_populates="interview", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="interview", uselist=False, cascade="all, delete-orphan")
```

#### 向量表（knowledge.py，pgvector）

```python
# backend/app/db/models/knowledge.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True)
    kb_id = Column(String(36), ForeignKey("knowledge_bases.id"), nullable=False, index=True)
    doc_id = Column(String(36), ForeignKey("knowledge_docs.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    metadata = Column(Text)  # JSON 字符串：{source_file, page, section}
    embedding = Column(Vector(1024))  # 向量维度，根据 embedding 模型调整
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

> 其余表（resumes、knowledge_bases、knowledge_docs、messages、evaluations、reports、user_stats）的字段设计与 PRD 第 7 章一致，此处不重复。SQLAlchemy 模型按相同字段定义即可。

### 3.3 数据库迁移

- 使用 **Alembic** 管理迁移
- 初始化：`alembic init alembic`
- 生成迁移：`alembic revision --autogenerate -m "create all tables"`
- 执行迁移：`alembic upgrade head`
- 部署时自动执行迁移（Docker entrypoint 中运行）
- pgvector 扩展需要在迁移中手动创建：`CREATE EXTENSION IF NOT EXISTS vector;`

---

## 4. API 接口设计

### 4.1 通用约定

- Base URL: `/api/v1`
- 认证：`Authorization: Bearer <jwt_token>`
- 请求/响应格式：JSON
- 分页：`?page=1&page_size=20`
- FastAPI 自动生成交互式 API 文档：`/docs`（Swagger UI）和 `/redoc`
- 统一响应格式（Pydantic 模型）：

```python
# backend/app/schemas/common.py
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: str = "ok"

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    total: int
    page: int
    page_size: int
```

### 4.2 Pydantic 请求/响应模型示例

```python
# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=32)
    nickname: Optional[str] = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    nickname: Optional[str]
    email: EmailStr
    avatar_url: Optional[str]
    target_role: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True  # ORM 模式，直接从 SQLAlchemy 模型转换

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
```

### 4.3 接口清单

#### 认证模块

| 方法 | 路径 | 说明 | 认证 | FastAPI 函数 |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | 注册 | 否 | `register(user: UserRegister)` |
| POST | `/api/v1/auth/login` | 登录 | 否 | `login(credentials: UserLogin)` |
| POST | `/api/v1/auth/logout` | 登出 | 是 | `logout()` |
| GET | `/api/v1/auth/me` | 获取当前用户 | 是 | `get_me(current_user: User = Depends(get_current_user))` |

#### 用户模块

| 方法 | 路径 | 说明 |
|---|---|---|
| PUT | `/api/v1/users/profile` | 更新个人资料 |
| GET | `/api/v1/users/stats` | 获取个人统计数据 |

#### 简历模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/resumes` | 获取简历列表 |
| POST | `/api/v1/resumes/upload` | 上传简历（multipart/form-data，文件字段名 `file`） |
| GET | `/api/v1/resumes/{resume_id}` | 获取简历详情 |
| PUT | `/api/v1/resumes/{resume_id}` | 更新简历（编辑解析结果） |
| DELETE | `/api/v1/resumes/{resume_id}` | 删除简历 |
| PUT | `/api/v1/resumes/{resume_id}/default` | 设为默认简历 |

**上传简历响应**：
```python
class ResumeOut(BaseModel):
    id: str
    name: str
    file_type: str
    content_text: Optional[str]
    parsed_data: Optional[dict]  # {education, experience, projects, skills}
    is_default: bool
    created_at: datetime
```

#### 面试模块

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/interviews` | 创建面试 |
| GET | `/api/v1/interviews` | 获取面试列表（分页+筛选：role_category/difficulty/status） |
| GET | `/api/v1/interviews/{interview_id}` | 获取面试详情 |
| POST | `/api/v1/interviews/{interview_id}/start` | 开始面试（返回 WebSocket 连接信息 + thread_id） |
| POST | `/api/v1/interviews/{interview_id}/end` | 主动结束面试 |
| GET | `/api/v1/interviews/{interview_id}/messages` | 获取面试消息记录 |

**创建面试请求**：
```python
class InterviewCreate(BaseModel):
    resume_id: str
    kb_id: Optional[str] = None
    role_category: str  # algorithm/backend/frontend/fullstack/pm
    difficulty: str = "medium"  # easy/medium/hard
    duration_minutes: int = 30
    personality: str = "gentle"  # gentle/strict/pressure
    voice_enabled: bool = False
    code_enabled: bool = False
    multi_agent: bool = False
```

**创建面试响应**：
```python
class InterviewStartResponse(BaseModel):
    interview_id: str
    status: str
    ws_url: str  # wss://host/ws/interview/{interview_id}?token=xxx
    thread_id: str  # LangGraph Checkpoint thread_id，用于恢复会话
```

#### 报告模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/interviews/{interview_id}/report` | 获取面试报告 |
| GET | `/api/v1/reports/share/{share_token}` | 通过分享链接查看报告（无需登录） |
| POST | `/api/v1/reports/{report_id}/share` | 生成分享链接 |
| GET | `/api/v1/reports/{report_id}/export` | 导出 PDF |

#### 知识库模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/knowledge-bases` | 获取知识库列表 |
| POST | `/api/v1/knowledge-bases` | 创建知识库 |
| DELETE | `/api/v1/knowledge-bases/{kb_id}` | 删除知识库 |
| GET | `/api/v1/knowledge-bases/{kb_id}/docs` | 获取文档列表 |
| POST | `/api/v1/knowledge-bases/{kb_id}/docs/upload` | 上传文档 |
| DELETE | `/api/v1/knowledge-bases/{kb_id}/docs/{doc_id}` | 删除文档 |
| GET | `/api/v1/knowledge-bases/{kb_id}/docs/{doc_id}/status` | 查询向量化状态 |

### 4.4 FastAPI 路由注册

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, user, resume, interview, report, history, knowledge
from app.ws.handler import websocket_endpoint
from app.core.exceptions import add_exception_handlers
from app.config import settings

app = FastAPI(
    title="Interview Copilot API",
    description="AI 面试模拟助手后端 API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
app.include_router(report.router, prefix="/api/v1/reports", tags=["报告"])
app.include_router(history.router, prefix="/api/v1/history", tags=["历史记录"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge-bases", tags=["知识库"])

# WebSocket 路由
app.add_api_websocket_route("/ws/interview/{interview_id}", websocket_endpoint)

# 健康检查
@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
```

---

## 5. WebSocket 协议设计（关键）

> WebSocket 协议是语言无关的，事件定义与 v1.0 一致。此处重点说明 Python 端的实现方式。

### 5.1 连接建立

- URL: `wss://<host>/ws/interview/{interview_id}?token=<jwt>`
- FastAPI WebSocket 端点：`app.add_api_websocket_route("/ws/interview/{interview_id}", websocket_endpoint)`
- 服务端验证：interview_id 归属当前用户 + token 有效 + 面试状态为 created/in_progress
- 连接成功后服务端发送 `server:connected` 事件
- 心跳：客户端每 30 秒发送 `ping`，服务端回复 `pong`；60 秒无消息自动断开

### 5.2 Python 端 WebSocket 实现

```python
# backend/app/ws/handler.py
from fastapi import WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from app.config import settings
from app.ws.connection_manager import manager
from app.ws.router import route_message
from app.agent.manager import agent_manager

async def websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
    token: str = Query(...)
):
    # 1. 验证 token
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # 2. 验证面试归属
    # ... 查询数据库，确认 interview_id 属于 user_id

    # 3. 接受连接
    await websocket.accept()
    await manager.connect(interview_id, websocket)

    # 4. 发送连接成功事件
    await manager.send_personal(interview_id, {
        "type": "server:connected",
        "data": {"interview_id": interview_id, "status": "in_progress"}
    })

    # 5. 启动或恢复 LangGraph Agent
    thread_id = await agent_manager.get_or_create_thread(interview_id)
    # 如果是新面试，启动 Agent（执行开场节点）
    # 如果是重连，从 Checkpoint 恢复

    try:
        # 6. 消息循环
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            # 路由到对应处理器
            await route_message(interview_id, user_id, msg, thread_id)
    except WebSocketDisconnect:
        manager.disconnect(interview_id)
        # 不结束面试，状态保留在 Checkpoint，30秒内可重连
```

### 5.3 事件定义（与 v1.0 一致）

客户端→服务端事件：`client:ready`、`client:answer`、`client:followup_answer`、`client:code_submit`、`client:skip_question`、`client:end_interview`、`client:typing`、`client:voice_chunk`、`client:voice_end`、`ping`

服务端→客户端事件：`server:connected`、`server:opening`、`server:question`、`server:question_chunk`、`server:question_end`、`server:followup`、`server:followup_chunk`、`server:code_question`、`server:code_review`、`server:reverse_question`、`server:ai_thinking`、`server:ai_speaking`、`server:stt_result`、`server:phase_change`、`server:timer_update`、`server:interview_ended`、`server:report_ready`、`server:error`、`pong`

> 完整事件数据结构见 PRD 第 5 章和 v1.0 实施文档第 5 章，此处不重复。

### 5.4 连接管理器

```python
# backend/app/ws/connection_manager.py
from fastapi import WebSocket
from typing import Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # interview_id -> websocket

    async def connect(self, interview_id: str, websocket: WebSocket):
        self.active_connections[interview_id] = websocket

    def disconnect(self, interview_id: str):
        self.active_connections.pop(interview_id, None)

    async def send_personal(self, interview_id: str, message: dict):
        ws = self.active_connections.get(interview_id)
        if ws and ws.client_state == "CONNECTED":
            await ws.send_text(json.dumps(message, ensure_ascii=False))

    async def send_stream_chunk(self, interview_id: str, event_type: str, delta: str):
        await self.send_personal(interview_id, {"type": event_type, "data": {"delta": delta}})

manager = ConnectionManager()
```

---

## 6. LangGraph 面试 Agent 详细设计（核心关键）

> ⚠️ **这是整个项目的技术核心和最大亮点**。以下为 Python 版 LangGraph 的完整设计。

### 6.1 为什么用 LangGraph Python 版

| 特性 | Python 版 | JS 版 | 对本项目的价值 |
|---|---|---|---|
| **Checkpoint** | ✅ 原生支持，多种后端（Memory/Postgres/SQLite） | ⚠️ 支持但不够完善 | ⭐ 面试状态自动持久化，断线重连直接恢复，不用自己写 Redis 序列化 |
| **时间旅行** | ✅ 支持回溯到任意状态 | ⚠️ 有限支持 | 调试面试流程，"回到上一题"功能 |
| **子图** | ✅ 完善支持 | ⚠️ 有限支持 | 多 Agent 模式下观察员作为子图并行执行 |
| **人机协同 (interrupt)** | ✅ 原生支持 `interrupt()` | ⚠️ 有限支持 | ⭐⭐ **最关键**：提问节点执行完后 `interrupt()` 暂停图，等待用户回答后通过 `Command(resume=...)` 恢复，完美适配面试的"AI问→等人答→AI评"循环 |
| **流式输出** | ✅ `astream_events()` / `astream()` | ✅ 支持 | AI 回复流式推送到前端 |
| **社区生态** | ⭐ 最丰富，教程/示例/问题最多 | 较少 | 遇到问题容易搜到答案 |

### 6.2 核心机制：interrupt() 实现人机对话

面试流程的本质是：**AI 提问 → 等待用户回答 → AI 评估 → 决策下一步**。LangGraph 的 `interrupt()` 完美适配这个模式：

```
提问节点执行完，推送问题给客户端
    │
    ▼
interrupt()  ← 图执行暂停，状态自动保存到 Checkpoint
    │
    ▼
（等待用户回答，可能是几秒也可能是几分钟）
    │
    ▼
客户端通过 WebSocket 发送 client:answer
    │
    ▼
服务端调用 graph.update_state() + Command(resume=answer)
    │
    ▼
图从暂停处恢复，进入评估节点
    │
    ▼
评估 → 条件边决策 → 提问/追问/总结
    │
    ▼
提问节点又 interrupt()...（循环）
```

### 6.3 状态定义（state.py）

```python
# backend/app/agent/state.py
from typing import TypedDict, Annotated, Optional, List, Dict, Any
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class InterviewState(TypedDict):
    # === 基础配置（面试开始时注入，不可变）===
    interview_id: str
    user_id: str
    resume_id: str
    resume_content: str              # 简历文本摘要
    role_category: str               # algorithm/backend/frontend/...
    difficulty: str                  # easy/medium/hard
    personality: str                 # gentle/strict/pressure
    duration_minutes: int
    kb_id: Optional[str]             # 知识库 ID
    code_enabled: bool
    multi_agent: bool

    # === 运行时状态 ===
    phase: str                       # opening/technical/followup/code/reverse/summary
    current_question_num: int
    current_question: str
    current_question_type: str       # concept/scenario/project/code
    followup_count: int
    max_followups: int               # 默认 2

    # === 对话历史（LangChain 消息格式，用 add_messages reducer）===
    messages: Annotated[List[BaseMessage], add_messages]

    # === 评分数据 ===
    evaluations: List[Dict[str, Any]]
    # 每个 evaluation:
    # {
    #   "question_num": int,
    #   "tech_depth": float, "expression": float,
    #   "adaptability": float, "foundation": float,
    #   "overall_score": float, "comment": str,
    #   "suggested_answer": str, "followup_count": int,
    #   "weak_points": List[str]
    # }

    # === 知识库检索结果 ===
    retrieved_context: str

    # === 时间控制 ===
    start_time: str                  # ISO 格式
    last_action_time: str

    # === 元数据 ===
    total_questions: int
    observer_notes: List[str]        # 多 Agent 模式
    error: Optional[str]

    # === 用户回答（interrupt 恢复时注入）===
    user_answer: Optional[str]
```

### 6.4 状态图定义（graph.py）

```python
# backend/app/agent/graph.py
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.agent.state import InterviewState
from app.agent.nodes.opening import opening_node
from app.agent.nodes.question import question_node
from app.agent.nodes.evaluate import evaluate_node
from app.agent.nodes.followup import followup_node
from app.agent.nodes.code_question import code_question_node
from app.agent.nodes.reverse import reverse_node
from app.agent.nodes.summary import summary_node

def after_evaluate(state: InterviewState) -> str:
    """条件边：评估后决定下一步（核心决策逻辑）"""
    from datetime import datetime
    elapsed = (datetime.now() - datetime.fromisoformat(state["start_time"])).total_seconds() / 60
    remaining_ratio = 1 - elapsed / state["duration_minutes"]

    # 1. 时间到了 → 反问或总结
    if remaining_ratio <= 0.1:
        return "summary" if state["phase"] == "reverse" else "reverse"

    # 2. 评分低且未超过追问上限 → 追问
    latest_eval = state["evaluations"][-1] if state["evaluations"] else None
    if (latest_eval and latest_eval["overall_score"] < 6.0
            and state["followup_count"] < state["max_followups"]):
        return "followup"

    # 3. 代码题模式，随机出代码题
    if (state["code_enabled"] and state["difficulty"] != "easy"
            and not any(m.additional_kwargs.get("type") == "code_question"
                        for m in state["messages"])
            and __import__("random").random() < 0.2):
        return "code"

    # 4. 剩余时间 15% → 反问
    if remaining_ratio <= 0.15 and state["phase"] != "reverse":
        return "reverse"

    # 5. 默认 → 下一题
    return "question"

# 构建状态图
builder = StateGraph(InterviewState)

# 添加节点
builder.add_node("opening", opening_node)
builder.add_node("question", question_node)
builder.add_node("evaluate", evaluate_node)
builder.add_node("followup", followup_node)
builder.add_node("code", code_question_node)
builder.add_node("reverse", reverse_node)
builder.add_node("summary", summary_node)

# 添加边
builder.add_edge(START, "opening")
builder.add_edge("opening", "question")        # 开场后进入第一题
builder.add_edge("question", "evaluate")       # 提问后等用户回答 → 评估
builder.add_edge("followup", "evaluate")       # 追问后等用户回答 → 评估
builder.add_edge("code", "evaluate")           # 代码题后等用户提交 → 评估
builder.add_edge("reverse", "summary")         # 反问后 → 总结

# 条件边：评估后决定下一步
builder.add_conditional_edges(
    "evaluate",
    after_evaluate,
    {
        "followup": "followup",
        "question": "question",
        "code": "code",
        "reverse": "reverse",
        "summary": "summary",
    }
)

builder.add_edge("summary", END)

# Checkpoint（状态持久化，支持断线重连和时间旅行）
# 开发用 MemorySaver，生产用 PostgresSaver
checkpointer = MemorySaver()

# 编译图
interview_graph = builder.compile(checkpointer=checkpointer)
```

### 6.5 各节点详细设计

#### 6.5.1 开场节点（opening.py）

```python
# backend/app/agent/nodes/opening.py
from langchain_core.messages import AIMessage, SystemMessage
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.agent.prompts.opening import OPENING_PROMPT
from app.ws.connection_manager import manager

async def opening_node(state: InterviewState) -> InterviewState:
    """开场节点：AI 面试官自我介绍 + 要求自我介绍"""
    # 构建 prompt
    prompt = OPENING_PROMPT.format(
        personality_desc=_get_personality_desc(state["personality"]),
        role_category=state["role_category"],
        resume_content=state["resume_content"][:2000],  # 限制长度
        difficulty_desc=_get_difficulty_desc(state["difficulty"]),
        duration_minutes=state["duration_minutes"],
    )

    # 调用 LLM（流式输出）
    llm = get_llm("opening")
    full_content = ""
    async for chunk in llm.astream(prompt):
        delta = chunk.content if hasattr(chunk, "content") else str(chunk)
        if delta:
            full_content += delta
            await manager.send_stream_chunk(state["interview_id"], "server:opening", delta)

    # 发送结束事件
    await manager.send_personal(state["interview_id"], {
        "type": "server:opening_end",
        "data": {"content": full_content}
    })

    # 更新状态
    return {
        "phase": "opening",
        "messages": [AIMessage(content=full_content, additional_kwargs={"type": "opening"})],
        "current_question_num": 0,
    }
```

#### 6.5.2 提问节点（question.py）— 含 interrupt()

```python
# backend/app/agent/nodes/question.py
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import interrupt, Command
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.agent.prompts.question import QUESTION_PROMPT
from app.rag.retrieve import retrieve_knowledge
from app.ws.connection_manager import manager

async def question_node(state: InterviewState) -> InterviewState:
    """提问节点：生成下一个问题，然后 interrupt() 等待用户回答"""
    question_num = state["current_question_num"] + 1

    # RAG 检索（如果启用了知识库）
    retrieved_context = ""
    if state.get("kb_id"):
        retrieved_context = await retrieve_knowledge(
            kb_id=state["kb_id"],
            query=f"{state['role_category']} 面试题 {state['role_category']}",
            top_k=5
        )

    # 构建 prompt
    prompt = QUESTION_PROMPT.format(
        role_category=state["role_category"],
        question_num=question_num,
        total_questions=state["total_questions"],
        resume_content=state["resume_content"][:2000],
        conversation_history=_format_history(state["messages"]),
        last_evaluation=_get_last_eval_comment(state),
        retrieved_context=retrieved_context,
        difficulty_desc=_get_difficulty_desc(state["difficulty"]),
        question_type_strategy=_get_type_strategy(state),
    )

    # 调用 LLM（要求输出 JSON：{type, content, knowledge_source}）
    llm = get_llm("question")
    from langchain_core.output_parsers import PydanticOutputParser
    from app.agent.prompts.question import QuestionOutput
    parser = PydanticOutputParser(pydantic_object=QuestionOutput)

    # 流式输出问题内容
    full_content = ""
    async for chunk in llm.astream(prompt):
        delta = chunk.content if hasattr(chunk, "content") else str(chunk)
        if delta:
            full_content += delta
            await manager.send_stream_chunk(state["interview_id"], "server:question_chunk", delta)

    # 解析输出（流式结束后解析完整内容）
    try:
        parsed = parser.parse(full_content)
        question_type = parsed.type
        question_content = parsed.content
        knowledge_source = parsed.knowledge_source
    except Exception:
        # 解析失败，用全文作为问题内容
        question_type = "concept"
        question_content = full_content
        knowledge_source = None

    # 发送问题结束事件
    await manager.send_personal(state["interview_id"], {
        "type": "server:question_end",
        "data": {
            "question_num": question_num,
            "content": question_content,
            "question_type": question_type,
            "knowledge_source": knowledge_source,
        }
    })

    # ⚠️ 关键：interrupt() 暂停图执行，等待用户回答
    # interrupt 的值会被发送到调用方，调用方通过 Command(resume=...) 恢复
    user_answer = interrupt({
        "type": "wait_for_answer",
        "question_num": question_num,
        "question_content": question_content,
    })

    # 恢复执行时，user_answer 是用户的回答
    return {
        "phase": "technical",
        "current_question_num": question_num,
        "current_question": question_content,
        "current_question_type": question_type,
        "followup_count": 0,
        "retrieved_context": retrieved_context,
        "messages": [
            AIMessage(content=question_content, additional_kwargs={
                "type": "question", "question_num": question_num
            }),
            HumanMessage(content=user_answer, additional_kwargs={"type": "answer"}),
        ],
        "user_answer": user_answer,
    }
```

#### 6.5.3 评估节点（evaluate.py）

```python
# backend/app/agent/nodes/evaluate.py
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.agent.prompts.evaluate import EVALUATION_PROMPT
from app.agent.prompts.evaluate import EvaluationOutput  # Pydantic 模型
from langchain_core.output_parsers import PydanticOutputParser
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
async def evaluate_node(state: InterviewState) -> InterviewState:
    """评估节点：对用户回答进行多维度评分"""
    # 获取当前问题和回答
    current_question = state["current_question"]
    user_answer = state.get("user_answer", "")
    followup_history = _get_followup_history(state)

    # 构建 prompt
    prompt = EVALUATION_PROMPT.format(
        role_category=state["role_category"],
        current_question=current_question,
        user_answer=user_answer,
        followup_history=followup_history,
    )

    # 调用 LLM（评分用低温模型，保证稳定性）
    llm = get_llm("evaluate")  # Claude Haiku / DeepSeek，temperature=0.3
    parser = PydanticOutputParser(pydantic_object=EvaluationOutput)

    response = await llm.ainvoke(prompt)
    evaluation = parser.parse(response.content)

    # 计算加权总分
    overall = (
        evaluation.tech_depth * 0.35
        + evaluation.expression * 0.25
        + evaluation.adaptability * 0.20
        + evaluation.foundation * 0.20
    )

    eval_dict = {
        "question_num": state["current_question_num"],
        "tech_depth": evaluation.tech_depth,
        "expression": evaluation.expression,
        "adaptability": evaluation.adaptability,
        "foundation": evaluation.foundation,
        "overall_score": round(overall, 1),
        "comment": evaluation.comment,
        "suggested_answer": evaluation.suggested_answer,
        "followup_count": state["followup_count"],
        "weak_points": evaluation.weak_points,
    }

    # 异步保存到数据库（不阻塞图执行）
    import asyncio
    asyncio.create_task(_save_evaluation(state["interview_id"], eval_dict))

    return {
        "evaluations": state["evaluations"] + [eval_dict],
        "user_answer": None,  # 清空，等待下一次 interrupt
    }
```

**EvaluationOutput Pydantic 模型**：
```python
# backend/app/agent/prompts/evaluate.py
from pydantic import BaseModel, Field
from typing import List

class EvaluationOutput(BaseModel):
    tech_depth: float = Field(..., ge=0, le=10, description="技术深度")
    expression: float = Field(..., ge=0, le=10, description="表达逻辑")
    adaptability: float = Field(..., ge=0, le=10, description="应变能力")
    foundation: float = Field(..., ge=0, le=10, description="基础知识")
    comment: str = Field(..., description="50-100字点评")
    suggested_answer: str = Field(..., description="示范回答，200字以内")
    weak_points: List[str] = Field(default_factory=list, description="薄弱点")
```

#### 6.5.4 追问节点（followup.py）

```python
# backend/app/agent/nodes/followup.py
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import interrupt
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.agent.prompts.followup import FOLLOWUP_PROMPT
from app.ws.connection_manager import manager

async def followup_node(state: InterviewState) -> InterviewState:
    """追问节点：基于薄弱点生成追问，然后 interrupt 等待回答"""
    latest_eval = state["evaluations"][-1]
    weak_points = latest_eval.get("weak_points", [])
    followup_num = state["followup_count"] + 1

    prompt = FOLLOWUP_PROMPT.format(
        role_category=state["role_category"],
        current_question=state["current_question"],
        user_answer=state["messages"][-1].content if state["messages"] else "",
        weak_points="; ".join(weak_points) if weak_points else "回答不够深入",
        personality_desc=_get_personality_desc(state["personality"]),
    )

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
                 "reason": f"针对薄弱点：{weak_points[0] if weak_points else '回答不够深入'}"}
    })

    # interrupt 等待用户回答追问
    user_answer = interrupt({
        "type": "wait_for_followup_answer",
        "followup_num": followup_num,
    })

    return {
        "phase": "followup",
        "followup_count": followup_num,
        "messages": [
            AIMessage(content=full_content, additional_kwargs={"type": "followup", "followup_num": followup_num}),
            HumanMessage(content=user_answer, additional_kwargs={"type": "followup_answer"}),
        ],
        "user_answer": user_answer,
    }
```

#### 6.5.5 总结节点（summary.py）

```python
# backend/app/agent/nodes/summary.py
from app.agent.state import InterviewState
from app.agent.llm import get_llm
from app.agent.prompts.summary import SUMMARY_PROMPT
from app.services.report_service import create_report
from app.ws.connection_manager import manager

async def summary_node(state: InterviewState) -> InterviewState:
    """总结节点：生成面试报告，保存到数据库，推送结束事件"""
    # 1. 计算各维度平均分
    evals = state["evaluations"]
    avg_tech = sum(e["tech_depth"] for e in evals) / len(evals) if evals else 0
    avg_expr = sum(e["expression"] for e in evals) / len(evals) if evals else 0
    avg_adapt = sum(e["adaptability"] for e in evals) / len(evals) if evals else 0
    avg_found = sum(e["foundation"] for e in evals) / len(evals) if evals else 0
    total_score = round(avg_tech * 0.35 + avg_expr * 0.25 + avg_adapt * 0.20 + avg_found * 0.20, 1)

    # 2. 薄弱点分析（统计出现频率）
    from collections import Counter
    all_weak = []
    for e in evals:
        all_weak.extend(e.get("weak_points", []))
    weak_counter = Counter(all_weak)
    top_weak = [{"point": w, "frequency": c} for w, c in weak_counter.most_common(5)]

    # 3. 调用 LLM 生成整体评价和改进建议
    prompt = SUMMARY_PROMPT.format(
        role_category=state["role_category"],
        total_score=total_score,
        dimension_scores=f"技术深度:{avg_tech:.1f} 表达逻辑:{avg_expr:.1f} 应变能力:{avg_adapt:.1f} 基础知识:{avg_found:.1f}",
        top_weak_points="; ".join([w["point"] for w in top_weak]),
        question_count=len(evals),
    )
    llm = get_llm("summary")
    summary_response = await llm.ainvoke(prompt)

    # 4. 保存报告到数据库
    report = await create_report(
        interview_id=state["interview_id"],
        total_score=total_score,
        dimension_scores={
            "tech_depth": round(avg_tech, 1),
            "expression": round(avg_expr, 1),
            "adaptability": round(avg_adapt, 1),
            "foundation": round(avg_found, 1),
        },
        question_reviews=evals,
        weaknesses=top_weak,
        suggestions=summary_response.get("suggestions", []),
        overall_comment=summary_response.get("overall_comment", ""),
        observer_comment="; ".join(state.get("observer_notes", [])) if state.get("multi_agent") else None,
    )

    # 5. 推送结束事件
    await manager.send_personal(state["interview_id"], {
        "type": "server:interview_ended",
        "data": {"interview_id": state["interview_id"], "reason": "completed", "report_id": str(report.id)}
    })
    await manager.send_personal(state["interview_id"], {
        "type": "server:report_ready",
        "data": {"report_id": str(report.id), "total_score": total_score}
    })

    return {
        "phase": "summary",
        "total_score": total_score,
    }
```

> 代码题节点（code_question.py）、反问节点（reverse.py）逻辑类似，此处不重复。

### 6.6 Agent 管理器（manager.py）— 协调图执行与 WebSocket

```python
# backend/app/agent/manager.py
from langgraph.types import Command
from app.agent.graph import interview_graph
from app.agent.state import InterviewState
from typing import Optional, Dict, Any
import uuid

class AgentManager:
    def __init__(self):
        self.threads: Dict[str, str] = {}  # interview_id -> thread_id

    def get_config(self, interview_id: str) -> dict:
        """获取 LangGraph 配置（含 thread_id，用于 Checkpoint）"""
        thread_id = self.threads.get(interview_id)
        if not thread_id:
            thread_id = str(uuid.uuid4())
            self.threads[interview_id] = thread_id
        return {"configurable": {"thread_id": thread_id}}

    async def start_interview(self, initial_state: InterviewState, interview_id: str):
        """启动面试：执行图从 START 到第一个 interrupt（提问节点）"""
        config = self.get_config(interview_id)
        # astream 执行，遇到 interrupt 会暂停
        async for event in interview_graph.astream(initial_state, config, stream_mode="updates"):
            # 节点输出已通过 WebSocket 在节点内部推送，这里只处理异常
            pass

    async def submit_answer(self, interview_id: str, answer: str):
        """用户提交回答：恢复图执行（从 interrupt 处恢复）"""
        config = self.get_config(interview_id)
        # Command(resume=answer) 恢复 interrupt，继续执行到下一个 interrupt
        async for event in interview_graph.astream(
            Command(resume=answer),
            config,
            stream_mode="updates"
        ):
            pass

    async def get_state(self, interview_id: str):
        """获取当前图状态（用于断线重连）"""
        config = self.get_config(interview_id)
        return interview_graph.get_state(config)

    async def end_interview(self, interview_id: str):
        """主动结束面试：跳转到总结节点"""
        config = self.get_config(interview_id)
        # 更新状态，强制进入 summary 节点
        await interview_graph.ainvoke(
            Command(goto="summary"),
            config
        )

agent_manager = AgentManager()
```

### 6.7 Checkpoint 与断线重连

```python
# 开发环境：MemorySaver（内存存储，重启丢失）
from langgraph.checkpoint.memory import MemorySaver
checkpointer = MemorySaver()

# 生产环境：PostgresSaver（持久化到 PostgreSQL，支持跨进程恢复）
# from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
# checkpointer = AsyncPostgresSaver.from_conn_string(DATABASE_URL)
# await checkpointer.setup()  # 自动创建 checkpoint 表

# 断线重连流程：
# 1. 客户端重连 WebSocket
# 2. 服务端调用 agent_manager.get_state(interview_id) 获取当前状态
# 3. 如果状态在 interrupt 处（等待用户回答），推送当前问题给客户端
# 4. 客户端恢复面试房间 UI，用户可继续回答
# 5. 如果状态已结束，推送 interview_ended 事件
```

### 6.8 LLM 调用封装（llm.py）

```python
# backend/app/agent/llm.py
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from app.config import settings

def get_llm(scenario: str):
    """根据场景选择不同的 LLM 提供商和模型"""
    if scenario == "evaluate":
        # 评分用低温，保证稳定性
        return ChatOpenAI(
            model="deepseek-chat",
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            temperature=0.3,
        )
    elif scenario == "summary":
        # 总结用高质量模型
        return ChatAnthropic(
            model="claude-3-5-haiku-20241022",
            api_key=settings.ANTHROPIC_API_KEY,
            temperature=0.4,
        )
    else:
        # 提问/追问/开场用性价比高的模型
        return ChatOpenAI(
            model="deepseek-chat",
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            temperature=0.7,
        )
```

---

## 7. RAG 知识库设计

### 7.1 文档摄入流程（Python + LangChain）

```
用户上传文档
    │
    ▼
文件保存到 backend/data/uploads/{kb_id}/{doc_id}.{ext}
    │
    ▼
文本提取（LangChain Document Loaders）
  ├─ PDF: PyPDFLoader / PDFPlumberLoader
  ├─ DOCX: Docx2txtLoader
  └─ TXT/MD: TextLoader
    │
    ▼
文本清洗（去页眉页脚、去重复空行、统一编码）
    │
    ▼
语义分块（LangChain Text Splitter）
  ├─ 优先用 MarkdownHeaderTextSplitter（按标题层级切分）
  ├─ 再用 RecursiveCharacterTextSplitter（每块 500-1000 token，重叠 100）
  └─ 每块保留 metadata（来源文件、章节标题）
    │
    ▼
生成 Embedding（LangChain Embeddings）
  ├─ 模型：DeepSeek embedding / HuggingFaceBgeEmbeddings
  ├─ 维度：1024
  └─ 批量处理（每批 32 块）
    │
    ▼
存入 pgvector（LangChain PGVector）
  ├─ PGVector.from_documents() / add_documents()
  └─ 自动创建向量索引（HNSW）
    │
    ▼
更新文档状态为 completed，更新 kb 的 chunk_count
```

### 7.2 检索流程

```python
# backend/app/rag/retrieve.py
from langchain_community.vectorstores.pgvector import PGVector
from langchain_community.embeddings import DeepSeekEmbeddings
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

async def retrieve_knowledge(kb_id: str, query: str, top_k: int = 5) -> str:
    """混合检索：向量检索 + BM25 关键词检索，取 Top 5"""
    # 1. 向量检索（pgvector）
    embeddings = DeepSeekEmbeddings(api_key=settings.DEEPSEEK_API_KEY)
    vector_store = PGVector(
        connection_string=settings.DATABASE_URL,
        embedding_function=embeddings,
        collection_name=f"kb_{kb_id}",  # 每个知识库一个 collection
    )
    vector_retriever = vector_store.as_retriever(search_kwargs={"k": 10})

    # 2. BM25 关键词检索（需要先加载文档）
    # docs = await load_kb_docs(kb_id)
    # bm25_retriever = BM25Retriever.from_documents(docs)
    # bm25_retriever.k = 10

    # 3. 混合检索（EnsembleRetriever）
    # ensemble = EnsembleRetriever(
    #     retrievers=[vector_retriever, bm25_retriever],
    #     weights=[0.7, 0.3]
    # )
    # results = await ensemble.ainvoke(query)

    # MVP 简化：先用向量检索
    results = await vector_retriever.ainvoke(query)

    # 4. 相似度阈值过滤
    results = [r for r in results if r.metadata.get("score", 1) > 0.5]

    # 5. 拼接为 context
    context_parts = []
    for i, doc in enumerate(results[:top_k]):
        source = doc.metadata.get("source", "未知来源")
        context_parts.append(f"[来源{i+1}: {source}]\n{doc.page_content}")

    return "\n\n".join(context_parts)
```

### 7.3 摄入服务（异步处理）

```python
# backend/app/services/knowledge_service.py
import asyncio
from app.rag.ingest import ingest_document

async def process_document_async(doc_id: str, kb_id: str, file_path: str):
    """异步处理文档摄入（不阻塞 API 响应）"""
    asyncio.create_task(_process_with_retry(doc_id, kb_id, file_path))

async def _process_with_retry(doc_id: str, kb_id: str, file_path: str):
    try:
        await update_doc_status(doc_id, "processing")
        chunk_count = await ingest_document(doc_id, kb_id, file_path)
        await update_doc_status(doc_id, "completed", chunk_count=chunk_count)
    except Exception as e:
        await update_doc_status(doc_id, "failed", error_message=str(e))
```

---

## 8. 前端架构设计

> 前端与 v1.0 基本一致（React 19 + TypeScript + Vite + Tailwind 4 + Zustand），唯一变化是 API 客户端从自定义协议改为基于 FastAPI OpenAPI 的类型生成。

### 8.1 API 客户端（适配 FastAPI）

```typescript
// frontend/src/lib/api.ts
// 方式一：手动封装（MVP 推荐）
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 30000,
});

// 请求拦截器：附加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// API 函数
export const authApi = {
  register: (data: RegisterData) => api.post("/auth/register", data),
  login: (data: LoginData) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

export const interviewApi = {
  create: (data: CreateInterviewData) => api.post("/interviews", data),
  start: (id: string) => api.post(`/interviews/${id}/start`),
  end: (id: string) => api.post(`/interviews/${id}/end`),
  list: (params?: ListParams) => api.get("/interviews", { params }),
  report: (id: string) => api.get(`/interviews/${id}/report`),
};

// 方式二：从 FastAPI OpenAPI 自动生成类型（推荐长期维护）
// npx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts
// 然后用 openapi-fetch 生成类型安全的 API 客户端
```

### 8.2 其余前端设计

路由、Zustand stores、WebSocket 客户端、面试房间组件结构、性能优化策略，与 v1.0 实施文档第 8 章完全一致，此处不重复。

---

## 9. 语音模块设计

> 语音模块逻辑与 v1.0 一致，实现方式改为 Python 后端调用 API。

### 9.1 STT（语音转文字）

```python
# backend/app/voice/stt.py
from openai import AsyncOpenAI
from app.config import settings

async def transcribe_audio(audio_file_path: str) -> str:
    """调用 Whisper API 转文字"""
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    with open(audio_file_path, "rb") as f:
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="zh",
        )
    return transcript.text
```

### 9.2 TTS（文字转语音）

```python
# backend/app/voice/tts.py
import edge_tts  # 免费方案
from app.config import settings

async def text_to_speech(text: str, output_path: str, voice: str = "zh-CN-XiaoxiaoNeural"):
    """Edge TTS 免费方案"""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    return output_path

# 付费方案：OpenAI TTS（质量更高）
# from openai import AsyncOpenAI
# async def openai_tts(text: str, output_path: str):
#     client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
#     response = await client.audio.speech.create(model="tts-1", voice="alloy", input=text)
#     await response.astream_to_file(output_path)
```

---

## 10. 代码面试模块设计

> 与 v1.0 一致，Monaco Editor 前端 + Python 后端 AI 评审。后端评审 Prompt 用 Pydantic 输出校验。MVP 不做真实代码运行（安全风险高），只做 AI 评审。

---

## 11. 多 Agent 模式设计

> Python 版可用 LangGraph 子图实现观察员 Agent，比 v1.0 的并行调用更优雅。

```python
# 观察员作为子图，在评估节点中并行调用
from langgraph.constants import Send
from app.agent.nodes.observer import observer_node

# 在 evaluate_node 中，主评估完成后，并行发送观察员任务
# observer_node 不影响主流程，只写入 state.observer_notes
```

---

## 12. 开发计划（14 天）

### 12.1 总览

| 阶段 | 天数 | 里程碑 | 关键交付物 |
|---|---|---|---|
| **第一阶段：基础搭建** | Day 1-2 | M1 | Python 后端骨架、数据库、用户系统、前端骨架、部署 |
| **第二阶段：面试核心** | Day 3-5 | M2 | LangGraph Agent、WebSocket、面试房间、实时问答、追问 |
| **第三阶段：报告闭环** | Day 6-7 | M3 | 报告生成、历史记录、数据看板、MVP上线 |
| **第四阶段：进阶功能** | Day 8-13 | M4 | RAG知识库、语音面试、代码面试、多Agent |
| **第五阶段：优化交付** | Day 14 | M5 | 性能优化、README、demo、用户反馈 |

### 12.2 Day 1：Python 后端初始化 + 数据库 + 用户系统

**目标**：FastAPI 后端能跑起来，数据库表建好，能注册登录

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | 项目结构初始化：frontend/ + backend/，Python 虚拟环境，依赖安装 | ⚠️ uv/pip 环境正确，依赖安装无冲突 | `uvicorn app.main:app --reload` 能启动，访问 /docs 看到 API 文档 |
| 上午 | 配置管理：pydantic-settings + .env，数据库连接（SQLAlchemy async + asyncpg） | ⚠️ 数据库连接正常，异步会话管理正确 | 能连接 PostgreSQL，执行查询 |
| 下午 | 数据库模型：9 张表的 SQLAlchemy 模型 + Alembic 迁移 + pgvector 扩展 | ⚠️ 所有表创建成功，向量表 embedding 字段类型正确 | `alembic upgrade head` 执行成功 |
| 下午 | 用户系统：注册/登录/JWT/bcrypt/认证依赖注入 | ⚠️ 密码 bcrypt 加密，JWT 签发验证，Depends 注入当前用户 | POST /auth/register 和 /auth/login 正常，受保护接口需要 token |
| 晚上 | 前端骨架：React + Vite + Tailwind 4 + 路由 + 登录/注册页 + AuthStore | - | 前端能登录，token 存 localStorage |
| 晚上 | docker-compose：postgres + redis + backend + frontend | ⚠️ 四个服务一键启动，前后端联通 | `docker compose up` 后全服务可用 |

**Day 1 Vibe Coding 起手 prompt**：

```
帮我创建一个 AI 面试模拟平台 "Interview Copilot" 的项目骨架。

项目结构：
- frontend/：React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand
- backend/：Python 3.11 + FastAPI + SQLAlchemy 2.0(async) + PostgreSQL + pgvector + Redis

后端要求：
1. 用 pydantic-settings 管理配置，读取 .env
2. 数据库用 SQLAlchemy 2.0 异步模式 + asyncpg 驱动
3. 创建 9 张表的 ORM 模型：
   - users(id, username, email, password_hash, nickname, avatar_url, target_role, graduation_year, created_at, updated_at)
   - resumes(id, user_id FK, name, file_path, file_type, content_text, parsed_data JSONB, is_default, created_at)
   - knowledge_bases(id, user_id FK, name, description, role_category, doc_count, chunk_count, created_at)
   - knowledge_docs(id, kb_id FK, file_name, file_path, content_text, chunk_count, status, error_message, created_at)
   - knowledge_chunks(id, kb_id FK, doc_id FK, chunk_index, content, metadata JSONB, embedding vector(1024), created_at) — 用 pgvector
   - interviews(id, user_id FK, resume_id FK, kb_id FK nullable, role_category, difficulty, duration_minutes, personality, voice_enabled, code_enabled, multi_agent, status, total_score, question_count, started_at, ended_at, created_at)
   - messages(id, interview_id FK, role, type, content, question_num, metadata JSONB, created_at)
   - evaluations(id, interview_id FK, question_msg_id FK, answer_msg_id FK, question_num, tech_depth, expression, adaptability, foundation, overall_score, comment, suggested_answer, followup_count, created_at)
   - reports(id, interview_id FK unique, total_score, dimension_scores JSONB, question_reviews JSONB, weaknesses JSONB, suggestions JSONB, overall_comment, observer_comment, behavior_data JSONB, pdf_url, share_token unique, created_at)
   - user_stats(user_id PK FK, total_interviews, total_minutes, avg_score, best_score, latest_interview_at, weakness_trend JSONB, score_history JSONB, updated_at)
4. Alembic 迁移配置，初始迁移创建所有表（含 CREATE EXTENSION vector）
5. 用户系统：注册/登录接口，PyJWT 签发 token（7天过期），bcrypt 密码加密，get_current_user 依赖注入
6. FastAPI 应用入口，CORS 中间件，全局异常处理，/docs 自动文档
7. 统一响应格式 ApiResponse<T>

前端要求：
1. React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand + React Router
2. 登录页、注册页、受保护路由组件
3. AuthStore（token + user 状态）
4. API 客户端（axios，拦截器附加 token，401 跳转登录）
5. shadcn/ui 组件库初始化

部署：
- docker-compose.yml：postgres:16 + pgvector、redis:7、backend(Dockerfile)、frontend(nginx)
- 后端 Dockerfile：python:3.11-slim，uvicorn 启动
- 前端 Dockerfile：node:20 构建 + nginx 托管

先输出项目结构和关键文件内容，我确认后再生成完整代码。注意所有 Python 代码要有类型注解，用 async/await。
```

### 12.3 Day 2-14 计划

> Day 2-14 的任务分解与 v1.0 实施文档第 12 章一致，唯一变化是技术实现从 TypeScript 改为 Python：
> - Day 2：简历管理（pdfplumber/python-docx 解析）+ 面试创建 + 部署
> - Day 3：LangGraph 状态图 + WebSocket（FastAPI WebSocket）
> - Day 4：面试核心流程（LangGraph 节点 + interrupt + 条件边）
> - Day 5：流程完善 + Checkpoint 断线重连
> - Day 6-7：报告 + 历史 + 看板 + MVP 上线
> - Day 8-9：RAG（LangChain + pgvector）
> - Day 10-11：语音（Whisper + Edge TTS）
> - Day 12-13：代码面试 + 多 Agent（LangGraph 子图）
> - Day 14：优化 + 交付

### 12.4 关键节点汇总（Python 版）

| 编号 | 关键节点 | 所在天 | 风险等级 | 说明 |
|---|---|---|---|---|
| K1 | Python 环境 + 依赖兼容性 | Day1 | 中 | langgraph/langchain 版本兼容性，SQLAlchemy 异步模式 |
| K2 | 数据库模型 + Alembic 迁移 + pgvector | Day1 | 中 | 向量字段类型、JSONB 字段、迁移自动生成 |
| K3 | **LangGraph interrupt() 人机协同** | Day3-4 | ⚠️ 高 | **核心机制**，提问后 interrupt 等待回答，Command(resume) 恢复，必须理解透彻 |
| K4 | **LangGraph 条件边 after_evaluate** | Day4 | ⚠️ 高 | 追问/换题/总结决策逻辑，决定面试是否智能 |
| K5 | **Checkpoint 状态持久化 + 断线重连** | Day5 | ⚠️ 高 | LangGraph Checkpoint 配置，thread_id 管理，重连时状态恢复 |
| K6 | FastAPI WebSocket 连接管理 | Day3 | 中 | 连接认证、消息路由、连接管理器 |
| K7 | LLM 流式输出 + WebSocket 推送 | Day4 | 中 | LangChain astream + WebSocket 分片推送 |
| K8 | Pydantic 输出校验 + 失败重试 | Day4 | 中 | LLM 输出 JSON 格式不稳定，PydanticOutputParser + tenacity 重试 |
| K9 | RAG 混合检索质量 | Day9 | 中 | pgvector 检索 + BM25 + 分块策略 |
| K10 | 前后端联调（CORS、类型、API） | Day2/5 | 中 | FastAPI CORS 配置、前端 API baseURL |
| K11 | 部署：Python Docker + 前端 nginx | Day2/14 | 低 | Dockerfile 编写、环境变量注入 |

---

## 13. 部署方案

### 13.1 部署架构

```
                    ┌─────────────┐
                    │   用户浏览器  │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │  Railway/Render │
                    │  (反向代理)     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌───▼────┐ ┌────▼─────┐
       │  Frontend   │ │ Backend│ │  Static  │
       │  (nginx)     │ │(FastAPI│ │  Assets  │
       │  Vite 构建   │ │+Uvicorn│ │          │
       └──────┬──────┘ └───┬────┘ └──────────┘
              │              │
       ┌──────▼──────┐ ┌────▼─────┐
       │  PostgreSQL  │ │  Redis   │
       │  + pgvector  │ │ (缓存)    │
       └─────────────┘ └──────────┘
```

### 13.2 后端 Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app

# 系统依赖（psycopg2/asyncpg 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 运行数据库迁移 + 启动服务
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
```

### 13.3 前端 Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 13.4 docker-compose.yml（本地开发）

```yaml
version: "3.8"
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: interview
      POSTGRES_PASSWORD: interview
      POSTGRES_DB: interview_copilot
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://interview:interview@postgres:5432/interview_copilot
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-in-production
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend/app:/app/app
      - upload_data:/app/data/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
  upload_data:
```

### 13.5 Railway 部署步骤

1. **创建 Railway 项目**，连接 GitHub 仓库
2. **添加服务**：
   - PostgreSQL（Railway 内置，自动配置连接字符串，需手动 `CREATE EXTENSION vector;`）
   - Redis（Railway 内置）
   - Backend（Dockerfile 部署，根目录或 backend/）
   - Frontend（Vercel 部署更优，或 Railway 静态托管）
3. **环境变量**（Railway dashboard 配置）：
   ```
   DATABASE_URL=postgresql+asyncpg://...
   REDIS_URL=redis://...
   JWT_SECRET=your-strong-secret
   DEEPSEEK_API_KEY=sk-xxx
   ANTHROPIC_API_KEY=sk-xxx (可选)
   OPENAI_API_KEY=sk-xxx (语音用，可选)
   CORS_ORIGINS=https://your-frontend-domain
   ```
4. **数据库初始化**：部署后自动执行 `alembic upgrade head`；手动执行 `CREATE EXTENSION IF NOT EXISTS vector;`
5. **域名**：Railway 自动分配 `xxx.up.railway.app`，前端可绑定自定义域名
6. **HTTPS**：Railway/Vercel 自动提供

---

## 14. 风险识别与应对

| 编号 | 风险 | 概率 | 影响 | 应对策略 |
|---|---|---|---|---|
| R1 | **LangGraph interrupt() 机制理解不到位，调试困难** | 高 | 高 | 先写最小可运行示例测试 interrupt/resume；阅读 LangGraph 官方文档的 human-in-the-loop 章节；用 graph.get_state() 查看当前状态；每个节点单独单元测试 |
| R2 | **LangGraph 版本更新快，API 变动** | 中 | 中 | 固定依赖版本（requirements.txt 写死版本号）；关注 CHANGELOG；升级前先在分支测试 |
| R3 | **LLM 输出格式不稳定（Pydantic 解析失败）** | 高 | 中 | PydanticOutputParser + format_instructions 注入 prompt；tenacity 重试（最多2次）；重试时强调格式；仍失败用规则兜底评分 |
| R4 | **langchain/langgraph 依赖冲突** | 中 | 中 | 用 uv 管理依赖，严格版本锁定；初始安装后生成 lockfile；避免混用 langchain 新旧 API |
| R5 | **Checkpoint 状态序列化问题** | 中 | 中 | 状态用 TypedDict，值用可序列化类型（str/int/float/list/dict）；BaseMessage 是 LangGraph 内置可序列化类型；避免在 state 中存不可序列化对象 |
| R6 | **FastAPI WebSocket 与 LangGraph 异步执行协调** | 中 | 中 | AgentManager 单例管理图执行；WebSocket 消息路由调用 agent_manager.submit_answer()；流式输出在节点内部通过 ConnectionManager 推送 |
| R7 | **Python 异步性能不足（高并发）** | 低 | 中 | MVP 限制并发；Uvicorn 多 worker；数据库连接池；Redis 缓存；后续可换 Granian（Rust 写的 ASGI 服务器） |
| R8 | **RAG 检索质量差** | 中 | 中 | 混合检索 + Rerank；语义分块；检索阈值过滤；用户反馈机制 |
| R9 | **API 成本超预算** | 中 | 低 | 提问用 DeepSeek，评分用 Haiku；限制 token 用量；每日调用上限；监控用量 |
| R10 | **前后端类型不同步** | 中 | 低 | 用 openapi-typescript 从 FastAPI OpenAPI 自动生成前端类型；或维护共享 types 文件 |
| R11 | **开发时间不够** | 中 | 中 | 严格按优先级：P0 必须完成，P1 尽量，P2 可延后；MVP 先上线再迭代 |

---

## 15. 质量保障

### 15.1 测试策略

| 测试类型 | 范围 | 工具 | 优先级 |
|---|---|---|---|
| 单元测试 | LangGraph 节点、条件边函数、评分计算、分块逻辑、Pydantic 模型 | pytest + pytest-asyncio | P0 |
| 集成测试 | API 接口（注册/登录/创建面试/报告）、数据库操作 | pytest + httpx (AsyncClient) + TestContainers | P0 |
| LangGraph 图测试 | 图能从 START 走到 END，条件边分支正确 | pytest + langgraph 内置测试 | P0 |
| WebSocket 测试 | 连接/消息/断线重连/流式输出 | 手动 + pytest-asyncio + websockets 客户端 | P1 |
| 端到端测试 | 完整面试流程 | Playwright | P1 |
| 性能测试 | 首屏加载、API 响应、并发 | Lighthouse + k6 / locust | P1 |
| 安全测试 | SQL 注入、XSS、越权、认证绕过 | 手动 + pip-audit + bandit | P0 |

### 15.2 Python 代码质量工具

```bash
# Lint + 格式化
ruff check app/          # 代码检查
ruff format app/         # 格式化

# 类型检查
mypy app/                # 静态类型检查

# 安全检查
bandit -r app/           # 安全漏洞扫描
pip-audit                # 依赖漏洞扫描

# 测试
pytest tests/ -v --cov=app --cov-report=html  # 运行测试 + 覆盖率
```

### 15.3 AI 生成代码审查清单（Python 版）

- [ ] 安全性：SQL 注入（SQLAlchemy 参数化查询）、XSS、硬编码密钥、权限校验
- [ ] 正确性：异步/await 正确使用、无阻塞调用、边界条件、异常处理
- [ ] 性能：N+1 查询（用 selectinload/joinedload）、异步 I/O、数据库连接池
- [ ] 类型：函数有完整类型注解、Pydantic 模型正确、无 Any 滥用
- [ ] 错误处理：异常有捕获、用户友好错误信息、FastAPI 异常处理器
- [ | 可维护性：代码结构清晰、命名合理、无重复代码、docstring
- [ ] LangGraph：节点纯函数化、state 只存可序列化数据、interrupt 使用正确

### 15.4 上线前检查清单

- [ ] 核心流程 100% 跑通
- [ ] 所有 P0 功能完成并测试
- [ ] 性能达标（首屏≤3s，AI首字≤5s）
- [ ] 安全检查通过（bandit + pip-audit + 手动）
- [ ] 环境变量正确配置（生产 JWT_SECRET 强密钥）
- [ ] 数据库备份策略
- [ ] 日志可查（loguru），错误有告警
- [ ] README 完整
- [ ] 至少 3 位真实用户试用过

---

## 16. Vibe Coding 执行策略

### 16.1 工具链

| 工具 | 用途 | 配置 |
|---|---|---|
| **Claude Code CLI** | 主力编程工具 | Opus 4.6 / Sonnet 4.5，1M context |
| **Cursor** | 辅助编辑、代码审查 | Python 扩展、Ruff 集成 |
| **Superpowers Skills** | 规划+执行规范 | brainstorming 模式先对齐方案 |
| **Playwright MCP** | AI 自主测试 | 让 AI 自己跑流程、截图验证 |
| **Context7 MCP** | 最新 API 文档 | 防止 AI 写过时的 FastAPI/LangGraph/SQLAlchemy API |

### 16.2 Python 项目 Vibe Coding 特别注意

1. **先固定依赖版本**：让 AI 生成 requirements.txt 时写死版本号，避免 langchain 版本变动导致 API 不兼容
2. **LangGraph 版本敏感**：明确告诉 AI 用 `langgraph==0.2.x`，API 用 `StateGraph`、`interrupt()`、`Command(resume=...)`、`add_conditional_edges`
3. **异步一致性**：强调所有 I/O 用 async/await，数据库用 SQLAlchemy 2.0 异步模式，Redis 用 async redis
4. **先跑通最小闭环**：先让 AI 做一个最小的 LangGraph 图（2个节点 + interrupt），验证 interrupt/resume 机制跑通，再扩展到完整面试流程
5. **Pydantic 输出校验**：让 AI 用 `PydanticOutputParser` 处理 LLM 输出，不要用正则或 json.loads 手动解析
6. **FastAPI 项目结构**：明确告诉 AI 用 routers + schemas + services + db/models 的分层结构，不要把所有逻辑写在 main.py

### 16.3 开发流程规范

```
每个功能模块的开发循环：

1. 【规划】让 AI 用 Superpowers brainstorming 写 spec + plan
   → 你人工确认方案

2. 【执行】让 AI 按 plan 逐步实现
   → 每个子步骤完成后检查
   → 遇到新技术用 Context7 拉文档

3. 【验证】让 AI 写 pytest 单元测试 + 用 Playwright 跑 E2E
   → 核心流程必须 AI 自主验证通过

4. 【审查】你人工 code review
   → 按 15.3 清单检查
   → LangGraph 相关代码必须细看

5. 【提交】git commit，开新会话或 /compact
```

### 16.4 上下文管理

- 每个大模块开始前 `/compact`
- 用 `/btw` 询问 Python 新技术（不记入主上下文）
- 数据库模型、Pydantic schema、LangGraph state 定义写在文件里，AI 可直接读取，不用重复描述
- 长文档（本实施文档、PRD）让 AI 读取文件，不要全部贴在对话里
- LangGraph 的 graph.py、state.py、各节点是核心文件，确保 AI 能读到最新版本

---

> **文档结束**
>
> 本文档为 Python 版实施方案，与《Interview Copilot PRD v1.0》配套使用。
>
> 核心技术栈：FastAPI + LangGraph(Python) + SQLAlchemy 2.0 + PostgreSQL/pgvector + React 19。
>
> 最关键的三个技术点：① LangGraph interrupt() 人机协同 ② 条件边决策逻辑 ③ Checkpoint 状态持久化。
