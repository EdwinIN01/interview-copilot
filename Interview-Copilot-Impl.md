# Interview Copilot — 项目实施文档（技术方案 + 开发计划）

> 版本：v1.0
> 日期：2026-08-30
> 配套文档：《Interview Copilot PRD v1.0》
> 开发周期：2 周（14 天）

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
| **前端框架** | React | 19.x | 生态最成熟，AI 生成代码质量最高，社区资源丰富 |
| **前端语言** | TypeScript | 5.x | 类型安全，全栈共享类型，减少运行时错误 |
| **构建工具** | Vite | 5.x | 开发体验好，HMR 快，构建产物优化 |
| **样式方案** | Tailwind CSS | 4.x | 原子化 CSS，AI 生成 UI 效率最高，v4 无需 config.js |
| **状态管理** | Zustand | 4.x | 轻量，API 简单，适合中小型应用，AI 容易理解 |
| **UI 组件** | shadcn/ui + Radix | - | 可定制，无样式依赖，与 Tailwind 完美配合 |
| **图表** | Recharts | 2.x | React 生态最好用的图表库，报告雷达图/趋势图 |
| **后端框架** | Hono.js | 4.x | 轻量、高性能、Edge 友好，API 设计简洁，AI 生成质量高 |
| **WebSocket** | ws | 8.x | 成熟稳定，与 Hono 配合好 |
| **运行时** | Node.js + tsx | 20.x | tsx 支持 TS 直接运行，无需编译，开发效率高 |
| **数据库** | PostgreSQL | 16.x | 支持 pgvector 向量扩展，关系型+向量一体化 |
| **ORM** | Drizzle ORM | 0.30.x | 轻量、类型安全、SQL 优先，与 TS 配合好，迁移简单 |
| **缓存/会话** | Redis | 7.x | 面试会话状态缓存、WebSocket 房间状态、限流 |
| **认证** | JWT + bcryptjs | - | 无状态认证，bcrypt 密码加密，简单可靠 |
| **AI 编排** | LangGraph (JS) | 0.2.x | 状态机+条件边，完美适配面试流程，用户正在学习 |
| **LLM** | DeepSeek API / Claude API | - | DeepSeek 性价比高中文好；Claude 质量高长上下文 |
| **Embedding** | DeepSeek embedding / bge-large-zh | - | 中文向量效果好，成本低 |
| **语音 STT** | OpenAI Whisper API / 阿里云 | - | Whisper 多语言准确率高；阿里云国内访问快 |
| **语音 TTS** | Edge TTS (免费) / OpenAI TTS | - | Edge TTS 免费够用，OpenAI TTS 质量更高 |
| **代码编辑** | Monaco Editor | 0.45.x | VS Code 同款，功能强大，@monaco-editor/react 封装好 |
| **包管理** | pnpm | 10.x | monorepo 支持好，速度快，磁盘占用少 |
| **容器化** | Docker + docker-compose | - | 标准化部署，环境一致 |
| **部署平台** | Railway / Render | - | 一键部署，支持 Docker，有免费额度，自带域名+HTTPS |
| **文件存储** | 本地文件系统 / Cloudflare R2 | - | MVP 用本地，量大后迁 R2 |
| **监控** | 简单日志 + Sentry (可选) | - | MVP 用控制台日志，后续加 Sentry |

### 1.2 系统架构图

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
              │  Hono HTTP  │           │  Hono WS     │
              │   REST API   │           │  实时面试     │
              └─────┬─────┘           └──────┬──────┘
                    │                         │
              ┌─────▼─────────────────────────▼─────┐
              │            服务层 (Hono + tsx)         │
              │  ┌──────────┐  ┌──────────────────┐  │
              │  │ 认证/用户  │  │ LangGraph Agent  │  │
              │  │ 简历/知识库 │  │ (面试状态机)      │  │
              │  │ 报告/统计  │  │                  │  │
              │  └──────────┘  └────────┬─────────┘  │
              │                           │            │
              │  ┌──────────┐  ┌─────────▼─────────┐ │
              │  │ RAG 检索  │  │  LLM 调用层        │ │
              │  │ (pgvector)│  │ DeepSeek / Claude │ │
              │  └──────────┘  └───────────────────┘ │
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

### 1.3 架构决策记录（ADR）

| 编号 | 决策 | 备选方案 | 决策理由 |
|---|---|---|---|
| ADR-001 | 用 LangGraph 做面试流程编排 | 直接链式调用 LLM / 手写状态机 | 面试是有状态多轮流程，需要条件分支（追问/换题/总结），LangGraph 状态机+条件边天然适配；手写状态机重复造轮子；链式调用无法做复杂决策 |
| ADR-002 | 用 PostgreSQL + pgvector 而非独立向量数据库 | Pinecone / Milvus / Chroma | 减少运维组件，关系型+向量一体化，MVP 阶段数据量小 pgvector 性能够用，迁移成本低 |
| ADR-003 | 用 Hono 而非 Express / NestJS | Express / NestJS / Fastify | Hono 轻量（~15KB）、性能高、TS 类型友好、Edge 兼容、API 简洁，AI 生成代码质量高；NestJS 太重，Express 类型不够好 |
| ADR-004 | 用 Drizzle ORM 而非 Prisma | Prisma / TypeORM / Knex | Drizzle 轻量、SQL 优先、类型安全、迁移简单、无运行时开销；Prisma 引擎重、冷启动慢、与 Edge 不兼容 |
| ADR-005 | 用 WebSocket 而非 SSE 做面试实时通信 | SSE + REST 轮询 | 面试需要双向实时通信（用户发回答、AI 推问题、状态同步），SSE 只能服务端推；WebSocket 全双工更适合 |
| ADR-006 | 用 pnpm monorepo 而非多仓库 | 多仓库 / single package | 共享类型包（shared）在前后端复用，monorepo 管理方便；pnpm 速度快磁盘省 |
| ADR-007 | LLM 抽象层支持多提供商切换 | 固定一家 | 不同场景用不同模型（提问用 DeepSeek 省钱，评分用 Claude 质量高），避免供应商锁定，API 变动时可快速切换 |

---

## 2. 项目结构与工程规范

### 2.1 目录结构

```
interview-copilot/
├── packages/
│   ├── shared/                          # 共享包：类型 + 协议 + 工具
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts              # 用户相关类型
│   │   │   │   ├── resume.ts            # 简历相关类型
│   │   │   ├── interview.ts          # 面试会话类型
│   │   │   │   ├── message.ts           # 消息类型
│   │   │   │   ├── evaluation.ts        # 评分类型
│   │   │   │   ├── report.ts            # 报告类型
│   │   │   │   └── knowledge.ts         # 知识库类型
│   │   │   ├── protocol/
│   │   │   │   ├── ws-events.ts         # WebSocket 事件定义（全类型安全）
│   │   │   │   └── api-types.ts         # REST API 请求/响应类型
│   │   │   ├── constants/
│   │   │   │   ├── roles.ts             # 岗位方向定义
│   │   │   │   ├── difficulties.ts      # 难度定义
│   │   │   │   └── personalities.ts     # AI 性格定义
│   │   │   └── utils/
│   │   │       ├── id.ts                # ID 生成
│   │   │       └── time.ts              # 时间工具
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── client/                          # 前端：React SPA
│   │   ├── src/
│   │   │   ├── main.tsx                 # 入口
│   │   │   ├── App.tsx                  # 路由
│   │   │   ├── components/              # 通用组件
│   │   │   │   ├── ui/                  # shadcn/ui 组件
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   ├── Dashboard.tsx        # 首页/数据看板
│   │   │   │   ├── Resume.tsx           # 简历管理
│   │   │   │   ├── CreateInterview.tsx  # 创建面试
│   │   │   │   ├── InterviewRoom.tsx    # 面试房间（核心）
│   │   │   │   ├── Report.tsx           # 报告页
│   │   │   │   ├── History.tsx          # 历史记录
│   │   │   │   └── Knowledge.tsx        # 知识库管理
│   │   │   ├── interview/               # 面试房间子组件
│   │   │   │   ├── ChatPanel.tsx        # 对话区
│   │   │   │   ├── MessageBubble.tsx    # 消息气泡
│   │   │   │   ├── QuestionCard.tsx     # 当前问题卡片
│   │   │   │   ├── InputArea.tsx        # 输入区
│   │   │   │   ├── TimerBar.tsx         # 计时器/进度
│   │   │   │   ├── CodeEditorPanel.tsx  # 代码编辑器（进阶）
│   │   │   │   └── VoiceControl.tsx     # 语音控制（进阶）
│   │   │   ├── report/                  # 报告子组件
│   │   │   │   ├── ScoreOverview.tsx
│   │   │   │   ├── RadarChart.tsx
│   │   │   │   ├── QuestionReview.tsx
│   │   │   │   ├── WeaknessAnalysis.tsx
│   │   │   │   └── Suggestions.tsx
│   │   │   ├── stores/                  # Zustand stores
│   │   │   │   ├── useAuthStore.ts
│   │   │   │   ├── useInterviewStore.ts # 面试会话状态
│   │   │   │   └── useUIStore.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts      # WebSocket 封装
│   │   │   │   ├── useVoice.ts          # 语音封装
│   │   │   │   └── useAuth.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts               # REST API 客户端
│   │   │   │   ├── wsClient.ts          # WebSocket 客户端
│   │   │   │   ├── resumeParser.ts      # 简历解析（前端辅助）
│   │   │   │   └── constants.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   └── package.json
│   │
│   └── server/                          # 后端：Hono + WebSocket
│       ├── src/
│       │   ├── index.ts                 # 入口，启动 HTTP + WS
│       │   ├── config/
│       │   │   ├── env.ts               # 环境变量配置
│       │   │   └── constants.ts
│       │   ├── db/
│       │   │   ├── index.ts             # 数据库连接
│       │   │   ├── schema.ts            # Drizzle schema（所有表）
│       │   │   ├── migrate.ts           # 迁移
│       │   │   └── repositories/        # 数据访问层
│       │   │       ├── userRepo.ts
│       │   │       ├── resumeRepo.ts
│       │   │       ├── interviewRepo.ts
│       │   │       ├── messageRepo.ts
│       │   │       ├── reportRepo.ts
│       │   │       └── knowledgeRepo.ts
│       │   ├── redis/
│       │   │   ├── index.ts             # Redis 连接
│       │   │   └── sessionStore.ts      # 面试会话缓存
│       │   ├── auth/
│       │   │   ├── jwt.ts               # JWT 签发/验证
│       │   │   ├── password.ts          # bcrypt 加密
│       │   │   └── middleware.ts        # 认证中间件
│       │   ├── routes/                  # REST API 路由
│       │   │   ├── auth.ts              # 注册/登录
│       │   │   ├── user.ts              # 用户资料
│       │   │   ├── resume.ts            # 简历上传/解析
│       │   │   ├── interview.ts         # 面试 CRUD
│       │   │   ├── report.ts            # 报告
│       │   │   ├── history.ts           # 历史记录
│       │   │   └── knowledge.ts         # 知识库
│       │   ├── ws/
│       │   │   ├── handler.ts           # WebSocket 连接处理
│       │   │   ├── router.ts            # 消息路由
│       │   │   └── roomManager.ts       # 房间管理
│       │   ├── agent/                   # ★ LangGraph 面试 Agent（核心）
│       │   │   ├── graph.ts             # 状态图定义
│       │   │   ├── state.ts             # 状态定义
│       │   │   ├── nodes/
│       │   │   │   ├── opening.ts       # 开场节点
│       │   │   │   ├── question.ts      # 提问节点
│       │   │   │   ├── evaluate.ts      # 评估节点
│       │   │   │   ├── followup.ts      # 追问节点
│       │   │   │   ├── codeQuestion.ts  # 代码题节点
│       │   │   │   ├── reverse.ts       # 反问节点
│       │   │   │   └── summary.ts       # 总结节点
│       │   │   ├── prompts/             # 每个节点的 prompt 模板
│       │   │   │   ├── opening.md
│       │   │   │   ├── question.md
│       │   │   │   ├── evaluate.md
│       │   │   │   ├── followup.md
│       │   │   │   └── summary.md
│       │   │   └── llm.ts               # LLM 调用封装（多提供商）
│       │   ├── rag/                     # RAG 知识库
│       │   │   ├── ingest.ts            # 文档摄入/向量化
│       │   │   ├── retrieve.ts          # 检索
│       │   │   ├── chunker.ts           # 文本分块
│       │   │   └── embedding.ts         # Embedding 封装
│       │   ├── services/                # 业务服务层
│       │   │   ├── interviewService.ts  # 面试业务逻辑
│       │   │   ├── reportService.ts     # 报告生成
│       │   │   ├── resumeService.ts     # 简历解析
│       │   │   └── statsService.ts      # 统计分析
│       │   ├── voice/                   # 语音模块（进阶）
│       │   │   ├── stt.ts               # 语音转文字
│       │   │   ├── tts.ts               # 文字转语音
│       │   │   └── audioUtils.ts
│       │   ├── middleware/
│       │   │   ├── cors.ts
│       │   │   ├── logger.ts
│       │   │   └── errorHandler.ts
│       │   └── utils/
│       │       ├── logger.ts
│       │       └── errors.ts
│       ├── Dockerfile
│       └── package.json
│
├── docs/
│   ├── api.md                           # API 文档
│   ├── ws-protocol.md                   # WebSocket 协议文档
│   └── architecture.md                  # 架构文档
├── scripts/
│   ├── init-db.sql                      # 数据库初始化
│   └── seed.ts                          # 种子数据
├── .dockerignore
├── .gitignore
├── .npmrc
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

### 2.2 工程规范

| 规范项 | 规则 |
|---|---|
| **包管理** | 统一用 pnpm，根目录 `pnpm install`，子包用 `pnpm --filter <pkg> <cmd>` |
| **TypeScript** | 严格模式 `strict: true`，禁止 `any`（必要时用 `unknown` + 类型守卫） |
| **命名** | 文件名 kebab-case；组件 PascalCase；变量/函数 camelCase；常量 UPPER_SNAKE_CASE |
| **导入顺序** | 第三方库 → 内部共享包 → 相对路径，空行分隔 |
| **Git 提交** | Conventional Commits：`feat: xxx` / `fix: xxx` / `chore: xxx` / `docs: xxx` |
| **分支** | `main` 主分支，开发用 `dev`，功能分支 `feat/xxx` |
| **环境变量** | 后端 `.env`，前端 `.env.local`，均不提交；提供 `.env.example` |
| **代码格式化** | Prettier（2空格缩进，单引号，无分号） |
| **Lint** | ESLint + typescript-eslint，pre-commit 钩子运行 |

---

## 3. 数据库设计

### 3.1 ER 关系概览

```
User 1───N Resume
User 1───N KnowledgeBase 1───N KnowledgeDoc
User 1───N Interview 1───N Message
Interview 1───1 Report
Interview 1───N Evaluation
Interview N───1 Resume
Interview N───0..1 KnowledgeBase
User 1───1 UserStats
```

### 3.2 表结构详细设计

#### users 表

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(50),
  avatar_url    VARCHAR(500),
  target_role   VARCHAR(50),        -- 目标岗位方向
  graduation_year INTEGER,           -- 毕业年份
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
```

#### resumes 表

```sql
CREATE TABLE resumes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,    -- 简历名称标签
  file_path     VARCHAR(500),              -- 原始文件存储路径
  file_type     VARCHAR(20),               -- pdf/docx/txt
  content_text  TEXT,                       -- 提取的纯文本
  parsed_data   JSONB,                      -- 结构化解析结果 {education, experience, projects, skills}
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
```

#### knowledge_bases 表

```sql
CREATE TABLE knowledge_bases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  role_category VARCHAR(50),          -- 适用岗位方向
  doc_count     INTEGER NOT NULL DEFAULT 0,
  chunk_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kb_user_id ON knowledge_bases(user_id);
```

#### knowledge_docs 表

```sql
CREATE TABLE knowledge_docs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id         UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  file_name     VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500),
  file_type     VARCHAR(20),
  content_text  TEXT,
  chunk_count   INTEGER NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/processing/completed/failed
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kb_docs_kb_id ON knowledge_docs(kb_id);
CREATE INDEX idx_kb_docs_status ON knowledge_docs(status);
```

#### knowledge_chunks 表（向量表，pgvector）

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id         UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  doc_id        UUID NOT NULL REFERENCES knowledge_docs(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,           -- 块序号
  content       TEXT NOT NULL,               -- 块文本内容
  metadata      JSONB,                       -- {source_file, page, section}
  embedding     vector(1024),                -- 向量维度，根据模型调整
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chunks_kb_id ON knowledge_chunks(kb_id);
CREATE INDEX idx_chunks_doc_id ON knowledge_chunks(doc_id);
-- 向量索引（HNSW，适合高维向量近似最近邻搜索）
CREATE INDEX idx_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
```

#### interviews 表

```sql
CREATE TABLE interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id       UUID NOT NULL REFERENCES resumes(id),
  kb_id           UUID REFERENCES knowledge_bases(id),  -- 可选，基于知识库
  role_category   VARCHAR(50) NOT NULL,     -- 岗位方向
  difficulty      VARCHAR(20) NOT NULL DEFAULT 'medium',  -- easy/medium/hard
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  personality     VARCHAR(20) NOT NULL DEFAULT 'gentle',  -- gentle/strict/pressure
  voice_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  code_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  multi_agent     BOOLEAN NOT NULL DEFAULT FALSE,
  status          VARCHAR(20) NOT NULL DEFAULT 'created', -- created/in_progress/completed/aborted
  total_score     DECIMAL(4,1),             -- 总分 0-10
  question_count  INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_created ON interviews(created_at DESC);
```

#### messages 表

```sql
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL,       -- ai/user/system
  type          VARCHAR(30) NOT NULL,       -- opening/question/answer/followup/code_question/reverse/summary
  content       TEXT NOT NULL,
  question_num  INTEGER,                     -- 第几题（AI 提问时）
  metadata      JSONB,                       -- {language, code_snippet, voice_url}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_interview_id ON messages(interview_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

#### evaluations 表

```sql
CREATE TABLE evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_msg_id UUID NOT NULL REFERENCES messages(id),  -- 对应哪道题
  answer_msg_id   UUID NOT NULL REFERENCES messages(id),  -- 对应哪次回答
  question_num    INTEGER NOT NULL,
  tech_depth      DECIMAL(3,1),             -- 技术深度 0-10
  expression      DECIMAL(3,1),             -- 表达逻辑 0-10
  adaptability    DECIMAL(3,1),             -- 应变能力 0-10
  foundation      DECIMAL(3,1),             -- 基础知识 0-10
  overall_score   DECIMAL(3,1),             -- 综合分
  comment         TEXT,                      -- AI 点评
  suggested_answer TEXT,                      -- 示范回答
  followup_count  INTEGER NOT NULL DEFAULT 0, -- 被追问次数
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_evaluations_interview ON evaluations(interview_id);
```

#### reports 表

```sql
CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id      UUID NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
  total_score       DECIMAL(4,1) NOT NULL,
  dimension_scores  JSONB NOT NULL,         -- {tech_depth, expression, adaptability, foundation}
  question_reviews  JSONB,                   -- 逐题回顾数组
  weaknesses        JSONB,                   -- 薄弱点分析 [{point, frequency, suggestion}]
  suggestions       JSONB,                   -- 改进建议数组
  overall_comment   TEXT,                    -- 整体评价
  observer_comment  TEXT,                    -- 观察员点评（多 Agent 模式）
  behavior_data     JSONB,                   -- 行为数据 {avg_answer_time, pause_count, followup_count}
  pdf_url           VARCHAR(500),
  share_token       VARCHAR(64) UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_interview ON reports(interview_id);
CREATE INDEX idx_reports_share_token ON reports(share_token);
```

#### user_stats 表

```sql
CREATE TABLE user_stats (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_interviews  INTEGER NOT NULL DEFAULT 0,
  total_minutes     INTEGER NOT NULL DEFAULT 0,
  avg_score         DECIMAL(4,2),
  best_score        DECIMAL(4,1),
  latest_interview_at TIMESTAMPTZ,
  weakness_trend    JSONB,                   -- 薄弱点趋势
  score_history     JSONB,                   -- 最近分数历史（用于趋势图）
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 数据库迁移策略

- 使用 Drizzle ORM 的 `drizzle-kit` 管理迁移
- 初始迁移：`pnpm --filter @interview-copilot/server db:generate`
- 执行迁移：`pnpm --filter @interview-copilot/server db:migrate`
- 部署时自动执行迁移（Docker entrypoint 中运行）

---

## 4. API 接口设计

### 4.1 通用约定

- Base URL: `/api/v1`
- 认证：`Authorization: Bearer <jwt_token>`
- 请求/响应格式：JSON
- 分页：`?page=1&pageSize=20`
- 统一响应格式：

```json
{
  "success": true,
  "data": { },
  "message": "ok"
}
```

错误响应：
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID",
    "message": "Token 已过期，请重新登录"
  }
}
```

### 4.2 接口清单

#### 认证模块

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/v1/auth/register` | 注册 | 否 |
| POST | `/api/v1/auth/login` | 登录 | 否 |
| POST | `/api/v1/auth/logout` | 登出 | 是 |
| GET | `/api/v1/auth/me` | 获取当前用户信息 | 是 |

**注册请求**：
```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "Abc12345",
  "nickname": "张三"
}
```

**登录响应**：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "zhangsan",
      "nickname": "张三",
      "email": "zhangsan@example.com",
      "avatar_url": null,
      "target_role": null
    }
  }
}
```

#### 用户模块

| 方法 | 路径 | 说明 |
|---|---|---|
| PUT | `/api/v1/users/profile` | 更新个人资料 |
| GET | `/api/v1/users/stats` | 获取个人统计数据 |

#### 简历模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/resumes` | 获取简历列表 |
| POST | `/api/v1/resumes/upload` | 上传简历（multipart/form-data） |
| GET | `/api/v1/resumes/:id` | 获取简历详情 |
| PUT | `/api/v1/resumes/:id` | 更新简历（编辑解析结果） |
| DELETE | `/api/v1/resumes/:id` | 删除简历 |
| PUT | `/api/v1/resumes/:id/default` | 设为默认简历 |

**上传响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "算法版简历",
    "file_type": "pdf",
    "content_text": "...",
    "parsed_data": {
      "education": [{ "school": "XX大学", "major": "计算机", "degree": "硕士" }],
      "experience": [...],
      "projects": [...],
      "skills": ["Python", "PyTorch", "LangGraph"]
    },
    "created_at": "2026-08-30T10:00:00Z"
  }
}
```

#### 面试模块

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/interviews` | 创建面试 |
| GET | `/api/v1/interviews` | 获取面试列表（分页+筛选） |
| GET | `/api/v1/interviews/:id` | 获取面试详情 |
| POST | `/api/v1/interviews/:id/start` | 开始面试（返回 WebSocket 连接信息） |
| POST | `/api/v1/interviews/:id/end` | 主动结束面试 |
| GET | `/api/v1/interviews/:id/messages` | 获取面试消息记录 |

**创建面试请求**：
```json
{
  "resume_id": "uuid",
  "kb_id": null,
  "role_category": "algorithm",
  "difficulty": "medium",
  "duration_minutes": 30,
  "personality": "gentle",
  "voice_enabled": false,
  "code_enabled": false,
  "multi_agent": false
}
```

**创建面试响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "created",
    "role_category": "algorithm",
    "difficulty": "medium",
    "duration_minutes": 30,
    "ws_url": "wss://api.example.com/ws/interview/uuid?token=xxx"
  }
}
```

#### 报告模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/interviews/:id/report` | 获取面试报告 |
| GET | `/api/v1/reports/:shareToken` | 通过分享链接查看报告（无需登录） |
| POST | `/api/v1/reports/:id/share` | 生成分享链接 |
| GET | `/api/v1/reports/:id/export` | 导出 PDF |

#### 知识库模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/knowledge-bases` | 获取知识库列表 |
| POST | `/api/v1/knowledge-bases` | 创建知识库 |
| DELETE | `/api/v1/knowledge-bases/:id` | 删除知识库 |
| GET | `/api/v1/knowledge-bases/:id/docs` | 获取文档列表 |
| POST | `/api/v1/knowledge-bases/:id/docs/upload` | 上传文档 |
| DELETE | `/api/v1/knowledge-bases/:id/docs/:docId` | 删除文档 |
| GET | `/api/v1/knowledge-bases/:id/docs/:docId/status` | 查询向量化状态 |

---

## 5. WebSocket 协议设计（关键）

### 5.1 连接建立

- URL: `wss://<host>/ws/interview/:interviewId?token=<jwt>`
- 服务端验证：interviewId 归属当前用户 + token 有效 + 面试状态为 created/in_progress
- 连接成功后服务端发送 `connected` 事件
- 心跳：客户端每 30 秒发送 `ping`，服务端回复 `pong`；60 秒无消息自动断开

### 5.2 事件定义（全类型安全，在 shared 包中定义）

#### 客户端 → 服务端事件

| 事件名 | 类型 | 说明 | 数据结构 |
|---|---|---|---|
| `client:ready` | 控制 | 用户已进入面试房间，准备开始 | `{}` |
| `client:answer` | 业务 | 用户回答问题 | `{ content: string, question_num: number }` |
| `client:followup_answer` | 业务 | 用户回答追问 | `{ content: string, followup_num: number }` |
| `client:code_submit` | 业务 | 提交代码 | `{ code: string, language: string }` |
| `client:skip_question` | 业务 | 跳过当前问题 | `{ reason?: string }` |
| `client:request_hint` | 业务 | 请求提示（简单模式可用） | `{}` |
| `client:end_interview` | 控制 | 用户主动结束面试 | `{}` |
| `client:typing` | 状态 | 用户正在输入 | `{ is_typing: boolean }` |
| `client:voice_chunk` | 语音 | 语音数据分片 | `{ audio: base64, sequence: number }` |
| `client:voice_end` | 语音 | 语音输入结束 | `{}` |
| `ping` | 心跳 | 心跳 | `{}` |

#### 服务端 → 客户端事件

| 事件名 | 类型 | 说明 | 数据结构 |
|---|---|---|---|
| `server:connected` | 控制 | 连接成功 | `{ interview_id, status, config }` |
| `server:opening` | 业务 | AI 开场（自我介绍+要求自我介绍） | `{ content: string, streaming: boolean }` |
| `server:question` | 业务 | AI 提问 | `{ question_num, content, question_type, difficulty, knowledge_source? }` |
| `server:question_chunk` | 业务 | 流式提问分片 | `{ question_num, delta: string }` |
| `server:question_end` | 业务 | 流式提问结束 | `{ question_num, full_content }` |
| `server:followup` | 业务 | AI 追问 | `{ question_num, followup_num, content, reason }` |
| `server:followup_chunk` | 业务 | 流式追问分片 | `{ delta: string }` |
| `server:evaluation` | 业务 | 回答评分（用户不可见具体分，仅用于内部） | `{ question_num, received: true }` |
| `server:code_question` | 业务 | 代码题 | `{ question_num, title, description, examples, constraints, language_options }` |
| `server:code_review` | 业务 | 代码评审 | `{ question_num, correctness, complexity, edge_cases, style, suggestions, reference_solution }` |
| `server:reverse_question` | 业务 | 反问环节提示 | `{ content: string }` |
| `server:ai_thinking` | 状态 | AI 正在思考 | `{ phase: string }` |
| `server:ai_speaking` | 语音 | AI 语音播放 | `{ audio_url: string, duration: number }` |
| `server:stt_result` | 语音 | 语音转文字结果 | `{ text: string, is_final: boolean }` |
| `server:phase_change` | 状态 | 面试阶段变化 | `{ phase: opening/technical/followup/code/reverse/summary, question_num? }` |
| `server:timer_update` | 状态 | 计时器更新 | `{ remaining_seconds: number }` |
| `server:interview_ended` | 控制 | 面试结束 | `{ interview_id, reason: completed/user_ended/timeout/error, report_id }` |
| `server:report_ready` | 控制 | 报告生成完成 | `{ report_id, total_score, report_url }` |
| `server:error` | 错误 | 错误通知 | `{ code: string, message: string, recoverable: boolean }` |
| `pong` | 心跳 | 心跳响应 | `{}` |

### 5.3 消息交互时序

```
客户端                                  服务端
  │                                       │
  │─── WSS 连接 (带 token) ─────────────→│
  │←── server:connected ─────────────────│
  │                                       │
  │─── client:ready ────────────────────→│
  │                                       │  LangGraph: 开场节点
  │←── server:opening (流式) ────────────│
  │                                       │
  │─── client:answer (自我介绍) ─────────→│
  │                                       │  LangGraph: 评估 → 决策 → 提问
  │←── server:ai_thinking ───────────────│
  │←── server:question (流式) ───────────│
  │                                       │
  │─── client:answer (回答Q1) ───────────→│
  │                                       │  LangGraph: 评估节点
  │←── server:evaluation (已接收) ────────│
  │                                       │  决策: 评分低 → 追问
  │←── server:followup (流式) ────────────│
  │                                       │
  │─── client:followup_answer ───────────→│
  │                                       │  评估 → 决策: 换题
  │←── server:question Q2 (流式) ─────────│
  │                                       │
  │         ... (循环) ...                 │
  │                                       │
  │←── server:timer_update (剩10%) ──────│
  │←── server:reverse_question ───────────│
  │                                       │
  │─── client:answer (反问) ─────────────→│
  │                                       │  LangGraph: 总结节点
  │←── server:interview_ended ────────────│
  │←── server:report_ready ───────────────│
  │                                       │
```

### 5.4 关键协议约束

1. **消息顺序保证**：同一面试房间的消息按发送顺序处理，服务端单线程处理每个房间
2. **消息幂等**：客户端消息带 `message_id`（UUID），服务端去重，防止网络重发导致重复回答
3. **流式协议**：AI 回复使用 `*_chunk` 事件分片，以 `*_end` 事件结束；客户端拼接 delta
4. **断线重连**：客户端断线后 30 秒内重连，服务端从 Redis 恢复会话状态，发送 `server:connected` + 未确认的消息
5. **超时处理**：用户 120 秒未回答，服务端提示"是否需要跳过"，再等 60 秒自动跳过

---

## 6. LangGraph 面试 Agent 详细设计（核心关键）

> ⚠️ **这是整个项目的技术核心和最大亮点**，面试时必须能讲清楚每个节点的职责、状态流转、条件边逻辑。

### 6.1 为什么用 LangGraph

面试不是简单的"用户问→AI答"，而是一个**有状态、有分支、可循环**的流程：

- 有状态：需要记住历史对话、当前评分、追问次数、剩余时间
- 有分支：回答好→换题，回答差→追问，时间到→总结
- 可循环：提问→回答→评估→（追问/换题）循环 N 次

LangGraph 的**状态机（StateGraph）+ 条件边（conditional_edges）** 完美适配这种场景。普通 LLM Chain 无法表达条件分支和循环。

### 6.2 状态定义（InterviewState）

```typescript
// packages/server/src/agent/state.ts

import { Annotation } from "@langchain/langgraph";

export const InterviewAnnotation = Annotation.Root({
  // === 基础配置（面试开始时注入，不可变）===
  interviewId: Annotation<string>,
  userId: Annotation<string>,
  resumeId: Annotation<string>,
  resumeContent: Annotation<string>,           // 简历文本摘要
  roleCategory: Annotation<string>,            // algorithm/backend/frontend/...
  difficulty: Annotation<string>,              // easy/medium/hard
  personality: Annotation<string>,              // gentle/strict/pressure
  durationMinutes: Annotation<number>,
  kbId: Annotation<string | undefined>,         // 知识库 ID（可选）
  codeEnabled: Annotation<boolean>,
  multiAgent: Annotation<boolean>,

  // === 运行时状态（不断更新）===
  phase: Annotation<"opening" | "technical" | "followup" | "code" | "reverse" | "summary">,
  currentQuestionNum: Annotation<number>,       // 当前第几题
  currentQuestion: Annotation<string>,           // 当前问题内容
  currentQuestionType: Annotation<"concept" | "scenario" | "code" | "project">,
  followupCount: Annotation<number>,              // 当前题已追问次数
  maxFollowups: Annotation<number>,               // 每题最大追问次数（默认2）

  // === 对话历史 ===
  messages: Annotation<Array<{
    role: "ai" | "user" | "system";
    type: string;
    content: string;
    questionNum?: number;
    timestamp: string;
  }>>,

  // === 评分数据 ===
  evaluations: Annotation<Array<{
    questionNum: number;
    techDepth: number;
    expression: number;
    adaptability: number;
    foundation: number;
    overallScore: number;
    comment: string;
    suggestedAnswer: string;
    followupCount: number;
  }>>,

  // === 知识库检索结果 ===
  retrievedContext: Annotation<string>,          // RAG 检索到的相关内容

  // === 时间控制 ===
  startTime: Annotation<string>,
  lastActionTime: Annotation<string>,

  // === 元数据 ===
  totalQuestions: Annotation<number>,             // 预计总题数
  questionScores: Annotation<number[]>,           // 每题平均分（用于趋势）
  observerNotes: Annotation<string[]>,            // 观察员记录（多 Agent 模式）
  error: Annotation<string | undefined>,
});

export type InterviewState = typeof InterviewAnnotation.State;
```

### 6.3 状态图（Graph）定义

```typescript
// packages/server/src/agent/graph.ts

import { StateGraph, START, END } from "@langchain/langgraph";
import { InterviewAnnotation } from "./state";
import { openingNode } from "./nodes/opening";
import { questionNode } from "./nodes/question";
import { evaluateNode } from "./nodes/evaluate";
import { followupNode } from "./nodes/followup";
import { codeQuestionNode } from "./nodes/codeQuestion";
import { reverseNode } from "./nodes/reverse";
import { summaryNode } from "./nodes/summary";

// 条件边：评估后决定下一步
function afterEvaluate(state: InterviewState): "followup" | "question" | "code" | "reverse" | "summary" {
  const elapsed = (Date.now() - new Date(state.startTime).getTime()) / 60000;
  const remainingRatio = 1 - elapsed / state.durationMinutes;

  // 1. 时间到了 → 总结
  if (remainingRatio <= 0.1) {
    return state.phase === "reverse" ? "summary" : "reverse";
  }

  // 2. 当前题评分低 且 未超过追问上限 → 追问
  const latestEval = state.evaluations[state.evaluations.length - 1];
  if (latestEval && latestEval.overallScore < 6.0 && state.followupCount < state.maxFollowups) {
    return "followup";
  }

  // 3. 中等以上难度，随机 20% 概率出代码题（且未出过代码题）
  if (state.difficulty !== "easy" && state.codeEnabled && Math.random() < 0.2 && !state.messages.some(m => m.type === "code_question")) {
    return "code";
  }

  // 4. 剩余时间 10% → 反问环节
  if (remainingRatio <= 0.15 && state.phase !== "reverse") {
    return "reverse";
  }

  // 5. 默认 → 下一题
  return "question";
}

// 构建状态图
const graph = new StateGraph(InterviewAnnotation)
  // 节点
  .addNode("opening", openingNode)
  .addNode("question", questionNode)
  .addNode("evaluate", evaluateNode)
  .addNode("followup", followupNode)
  .addNode("code", codeQuestionNode)
  .addNode("reverse", reverseNode)
  .addNode("summary", summaryNode)

  // 边
  .addEdge(START, "opening")
  .addEdge("opening", "question")           // 开场后直接进入第一题
  .addEdge("question", "evaluate")           // 提问后等用户回答 → 评估
  .addEdge("followup", "evaluate")           // 追问后等用户回答 → 评估
  .addEdge("code", "evaluate")               // 代码题后等用户提交 → 评估
  .addEdge("reverse", "summary")             // 反问环节后 → 总结

  // 条件边：评估后决定下一步（核心决策逻辑）
  .addConditionalEdges("evaluate", afterEvaluate, {
    followup: "followup",
    question: "question",
    code: "code",
    reverse: "reverse",
    summary: "summary",
  })

  .addEdge("summary", END);

export const interviewAgent = graph.compile();
```

### 6.4 各节点详细设计

#### 6.4.1 开场节点（openingNode）

**职责**：
- AI 面试官自我介绍（根据性格设定语气）
- 说明面试规则（时长、流程、注意事项）
- 要求用户做 1 分钟自我介绍
- 初始化面试状态

**输入**：完整的 InterviewState（配置已注入）
**输出**：更新 `phase = "opening"`，添加开场消息到 `messages`，通过 WebSocket 推送给客户端

**Prompt 模板**：
```
你是一位{personality_desc}的{role_category}面试官，正在面试一位应聘{role_category}岗位的候选人。

候选人简历摘要：
{resume_content}

面试配置：
- 难度：{difficulty_desc}
- 时长：{duration_minutes}分钟
- 岗位方向：{role_category}

请完成开场：
1. 简短自我介绍（你是XX公司的{role_category}面试官）
2. 说明面试流程和规则
3. 请候选人做1分钟自我介绍

要求：
- 语气{personality_desc}
- 简洁明了，不超过200字
- 直接输出开场内容，不要加任何前缀或解释
```

#### 6.4.2 提问节点（questionNode）

**职责**：
- 根据简历、岗位方向、难度、历史对话生成下一个问题
- 如果启用了知识库，先进行 RAG 检索，基于知识库内容出题
- 判断题型（概念题/场景题/项目题/代码题）
- 通过 WebSocket 流式推送问题

**输入**：InterviewState（含历史对话、评分数据）
**输出**：更新 `currentQuestion`、`currentQuestionNum++`、`currentQuestionType`、`phase = "technical"`，添加问题消息

**RAG 检索逻辑**：
```
if kbId 存在:
  1. 构建检索 query：当前岗位方向 + 上一题主题 + 候选人薄弱点
  2. 混合检索：向量检索 Top 10 + BM25 关键词检索 Top 10
  3. Rerank：取 Top 5
  4. 拼接为 context 字符串，存入 state.retrievedContext
```

**Prompt 模板**：
```
你是一位{role_category}面试官，正在进行第{question_num}题（共约{total_questions}题）。

候选人简历摘要：
{resume_content}

历史对话：
{conversation_history}

上一题评分：{last_evaluation_comment}

{知识库内容段，可选}
参考知识库内容：
{retrieved_context}
请优先基于知识库内容出题，并在题目后标注来源。

要求：
1. 生成一个{difficulty_desc}难度的{role_category}面试题
2. 题型选择：{question_type_strategy}（根据历史避免重复题型）
3. 问题要具体、有深度，避免泛泛而谈
4. 如果候选人之前在某个知识点薄弱，适当出相关题目
5. 直接输出问题内容，不要加解释

题目格式：
{ "type": "concept|scenario|project|code", "content": "问题内容", "knowledge_source": "可选来源" }
```

#### 6.4.3 评估节点（evaluateNode）

**职责**：
- 对用户的回答进行多维度评分
- 生成点评和示范回答
- 记录评分数据
- 不直接推送评分给用户（避免影响后续回答），评分在报告中展示

**输入**：InterviewState（含当前问题和用户回答）
**输出**：添加 evaluation 到 `evaluations` 数组，更新 `followupCount`（如果是追问后的评估则+1）

**评分维度**：

| 维度 | 权重 | 评分标准 |
|---|---|---|
| 技术深度 (tech_depth) | 35% | 对技术原理的理解深度，是否能讲清底层机制，是否有实践经验 |
| 表达逻辑 (expression) | 25% | 回答结构是否清晰，逻辑是否连贯，语言是否简洁准确 |
| 应变能力 (adaptability) | 20% | 面对不熟悉的问题是否能合理推导，被追问时是否能保持冷静 |
| 基础知识 (foundation) | 20% | 基础概念是否准确，是否有常识性错误 |

**Prompt 模板**：
```
你是一位严格的{role_category}面试官，请对候选人的回答进行评分。

问题：{current_question}
候选人回答：{user_answer}
{追问历史，如果有}
之前的追问：{followup_history}
候选人对追问的回答：{followup_answers}

评分维度（每项0-10分）：
1. 技术深度(35%)：对技术原理的理解深度
2. 表达逻辑(25%)：回答结构和语言表达
3. 应变能力(20%)：应对不熟悉问题和追问的表现
4. 基础知识(20%)：基础概念准确性

请输出JSON格式：
{
  "tech_depth": 0-10,
  "expression": 0-10,
  "adaptability": 0-10,
  "foundation": 0-10,
  "overall_score": 加权总分,
  "comment": "50-100字的点评，指出优点和不足",
  "suggested_answer": "一个较好的回答示范，200字以内",
  "weak_points": ["薄弱点1", "薄弱点2"]
}

只输出JSON，不要其他内容。
```

**输出校验**：
- 使用 zod 校验 JSON 格式
- 分数范围 0-10
- 校验失败自动重试（最多 2 次），仍失败则用规则兜底评分

#### 6.4.4 追问节点（followupNode）

**职责**：
- 基于评估结果中的薄弱点，生成针对性追问
- 说明追问原因（让用户知道为什么被追问）
- 追问次数 +1

**输入**：InterviewState（含最新评估）
**输出**：更新 `phase = "followup"`，`followupCount++`，推送追问

**Prompt 模板**：
```
你是一位{role_category}面试官。候选人刚才的回答存在以下薄弱点：
{weak_points_from_evaluation}

请针对最关键的一个薄弱点进行追问，要求：
1. 追问要具体，引导候选人深入解释
2. 不要直接告诉候选人答案
3. 语气{personality_desc}
4. 不超过100字

追问原因：{reason_for_followup}
追问内容：{followup_question}
```

#### 6.4.5 代码题节点（codeQuestionNode）

**职责**：
- 生成一道算法题（题目描述、示例、约束）
- 推送代码题事件，前端展示 Monaco Editor
- 等待用户提交代码后进入评估

**输入**：InterviewState
**输出**：`phase = "code"`，推送 `server:code_question` 事件

**Prompt 模板**：
```
请生成一道{difficulty_desc}难度的算法面试题，适合{role_category}岗位。

要求：
1. 题目描述清晰，包含输入输出说明
2. 提供 2-3 个示例（含输入输出和解释）
3. 给出约束条件（数据范围、时间复杂度要求）
4. 题目要经典但不烂大街，能考察算法思维
5. 难度：{difficulty_desc}

输出JSON：
{
  "title": "题目标题",
  "description": "题目描述",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["约束1", "约束2"],
  "language_options": ["python", "java", "cpp", "javascript"]
}
```

#### 6.4.6 反问节点（reverseNode）

**职责**：
- 模拟真实面试的"你有什么问题想问我"环节
- 给用户建议可以问的问题方向
- 等待用户提问后，AI 以面试官身份回答

**输入**：InterviewState
**输出**：`phase = "reverse"`，推送反问提示

#### 6.4.7 总结节点（summaryNode）

**职责**：
- 汇总所有评分，计算总分和各维度平均分
- 分析薄弱点（跨题统计）
- 生成改进建议
- 生成整体评价
- 保存报告到数据库
- 更新用户统计数据
- 推送 `server:interview_ended` + `server:report_ready`

**输入**：完整 InterviewState
**输出**：报告入库，推送结束事件

**报告生成逻辑**：
```
1. 计算各维度平均分 = 所有 evaluation 的该维度之和 / 题数
2. 总分 = 加权平均（tech_depth 35% + expression 25% + adaptability 20% + foundation 20%）
3. 薄弱点分析：
   - 统计所有 evaluation.weak_points 出现频率
   - 取 Top 5，按频率排序
   - 每个薄弱点附带改进建议
4. 改进建议：
   - 基于最低分维度给出针对性建议
   - 基于薄弱点给出学习资源方向
   - 至少 3 条具体可执行的建议
5. 整体评价：根据总分区间生成
   - 9-10: 优秀，可冲击大厂SP
   - 7-8.9: 良好，有竞争力，需补强薄弱点
   - 5-6.9: 中等，需要大量练习
   - <5: 基础薄弱，建议系统复习
```

### 6.5 节点间的用户等待机制

LangGraph 图是同步执行的，但面试需要**等待用户回答**。实现方式：

```
方案：图执行暂停 + 外部事件恢复

1. question/followup/code 节点执行完，推送问题给客户端后，
   图执行暂停（保存当前状态到 Redis + 数据库）

2. 服务端 WebSocket 收到 client:answer 事件，
   将回答写入 state.messages，恢复图执行 → 进入 evaluate 节点

3. evaluate 节点执行完，根据条件边决定下一步：
   - 如果是 question/followup/code → 执行该节点 → 再次暂停等待
   - 如果是 reverse → 执行后暂停等待用户反问
   - 如果是 summary → 执行完结束

实现：LangGraph 的 interrupt() 功能 + 外部状态存储
```

### 6.6 LLM 调用封装（多提供商）

```typescript
// packages/server/src/agent/llm.ts

interface LLMProvider {
  complete(prompt: string, options: LLMOptions): Promise<string>;
  stream(prompt: string, options: LLMOptions): AsyncIterable<string>;
}

// 提供商路由：不同场景用不同模型
function getProvider(scenario: "question" | "evaluate" | "followup" | "summary"): LLMProvider {
  switch (scenario) {
    case "question":
      return new DeepSeekProvider({ model: "deepseek-chat", temperature: 0.7 });
    case "evaluate":
      return new ClaudeProvider({ model: "claude-haiku", temperature: 0.3 }); // 评分要稳定
    case "followup":
      return new DeepSeekProvider({ model: "deepseek-chat", temperature: 0.5 });
    case "summary":
      return new ClaudeProvider({ model: "claude-sonnet", temperature: 0.4 }); // 总结要高质量
  }
}

// 流式输出：通过 WebSocket 推送 delta
async function streamQuestion(state: InterviewState, ws: WebSocket): Promise<string> {
  const provider = getProvider("question");
  const prompt = buildQuestionPrompt(state);
  let fullContent = "";
  for await (const delta of provider.stream(prompt)) {
    fullContent += delta;
    ws.send(JSON.stringify({ type: "server:question_chunk", data: { delta } }));
  }
  ws.send(JSON.stringify({ type: "server:question_end", data: { full_content: fullContent } }));
  return fullContent;
}
```

---

## 7. RAG 知识库设计

### 7.1 文档摄入流程

```
用户上传文档
    │
    ▼
文件保存到本地文件系统 (/data/uploads/{kbId}/{docId}.{ext})
    │
    ▼
文本提取
  ├─ PDF: pdf-parse / pdfjs-dist
  ├─ DOCX: mammoth
  └─ TXT/MD: 直接读取
    │
    ▼
文本清洗（去页眉页脚、去重复空行、统一编码）
    │
    ▼
语义分块（chunker.ts）
  ├─ 优先按标题层级切分（# / ## / ###）
  ├─ 每块 500-1000 token
  ├─ 相邻块重叠 100 token（保证上下文连续）
  └─ 每块保留 metadata（来源文件、章节标题）
    │
    ▼
生成 Embedding
  ├─ 模型：DeepSeek embedding / bge-large-zh
  ├─ 维度：1024（DeepSeek）/ 1024（bge）
  └─ 批量处理（每批 32 块）
    │
    ▼
存入 pgvector (knowledge_chunks 表)
    │
    ▼
更新文档状态为 completed，更新 kb 的 chunk_count
```

### 7.2 检索流程

```
提问节点需要出题时
    │
    ▼
构建检索 Query
  query = "{role_category} 面试题 {last_topic} {candidate_weakness}"
    │
    ▼
混合检索（Hybrid Search）
  ├─ 向量检索：embedding(query) → pgvector HNSW 余弦相似度 → Top 10
  ├─ 关键词检索：BM25（使用 pg_trgm 或 tsvector）→ Top 10
  └─ 合并去重 → 候选 15 块
    │
    ▼
Rerank（重排序）
  ├─ 模型：bge-reranker / Cohere Rerank
  ├─ 对 15 块计算 query-chunk 相关性分数
  └─ 取 Top 5
    │
    ▼
上下文拼接
  context = Top5 块的 content 拼接（每块前标注来源）
    │
    ▼
传入提问节点的 prompt
```

### 7.3 检索质量保障

| 策略 | 说明 |
|---|---|
| 语义分块而非固定长度 | 按标题/段落切分，保证每块语义完整 |
| 重叠分块 | 相邻块重叠 100 token，避免边界信息丢失 |
| 混合检索 | 向量检索（语义）+ 关键词检索（精确匹配）互补 |
| Rerank | 二次排序提升相关性，减少检索噪声 |
| 来源标注 | 每道题标注知识来源，增加可信度 |
| 检索阈值 | 相似度低于 0.5 的块不纳入，避免无关内容干扰 |

---

## 8. 前端架构设计

### 8.1 路由设计

```
/                    → 重定向到 /dashboard（已登录）或 /login（未登录）
/login               → 登录页
/register            → 注册页
/dashboard           → 首页/数据看板（需登录）
/resume              → 简历管理（需登录）
/interviews/create   → 创建面试（需登录）
/interviews/:id      → 面试房间（需登录，WebSocket 连接）
/interviews/:id/report → 报告页（需登录）
/history             → 历史记录（需登录）
/knowledge           → 知识库管理（需登录）
/report/share/:token → 分享报告（公开，无需登录）
```

### 8.2 状态管理（Zustand）

#### useAuthStore
```typescript
{
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  login: (token, user) => void,
  logout: () => void,
  updateUser: (patch) => void,
}
```

#### useInterviewStore（核心）
```typescript
{
  // 会话状态
  interviewId: string | null,
  status: "idle" | "connecting" | "connected" | "in_progress" | "ended",
  phase: "opening" | "technical" | "followup" | "code" | "reverse" | "summary",

  // 面试配置
  config: InterviewConfig | null,

  // 当前问题
  currentQuestionNum: number,
  currentQuestion: string,
  currentQuestionType: string,

  // 消息列表
  messages: Message[],

  // 输入状态
  inputText: string,
  isAITyping: boolean,
  isUserTyping: boolean,

  // 计时
  remainingSeconds: number,
  totalSeconds: number,

  // 语音
  voiceEnabled: boolean,
  isRecording: boolean,
  isAIPlaying: boolean,

  // 代码
  codeEditor: {
    visible: boolean,
    language: string,
    code: string,
    question: CodeQuestion | null,
  },

  // Actions
  connect: (interviewId) => void,
  disconnect: () => void,
  sendAnswer: (content) => void,
  sendFollowupAnswer: (content) => void,
  submitCode: (code, language) => void,
  endInterview: () => void,
  addMessage: (msg) => void,
  setPhase: (phase) => void,
  setRemainingTime: (seconds) => void,
}
```

### 8.3 WebSocket 客户端封装

```typescript
// packages/client/src/lib/wsClient.ts

class InterviewWSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageHandlers = new Map<string, Set<(data: any) => void>>();

  connect(interviewId: string, token: string) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/interview/${interviewId}?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("connected", {});
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.emit(msg.type, msg.data);
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.connect(interviewId, token), 2000 * this.reconnectAttempts);
        this.reconnectAttempts++;
      }
    };
  }

  send(type: string, data: any = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, message_id: crypto.randomUUID() }));
    }
  }

  on(type: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    return () => this.messageHandlers.get(type)!.delete(handler);
  }

  private emit(type: string, data: any) {
    this.messageHandlers.get(type)?.forEach(h => h(data));
  }
}
```

### 8.4 面试房间组件结构

```
InterviewRoom.tsx
├── TimerBar (顶部：进度+计时+退出)
├── ChatPanel (左侧：对话列表)
│   ├── MessageBubble (AI/用户消息，支持流式)
│   └── TypingIndicator (AI 思考中)
├── QuestionCard (右上：当前问题)
├── CodeEditorPanel (右中：代码编辑器，条件渲染)
│   └── MonacoEditor
├── ReferencePanel (右下：参考要点，折叠)
└── InputArea (底部：输入+发送+语音)
    ├── TextArea
    ├── VoiceButton (麦克风)
    └── SendButton
```

### 8.5 性能优化策略

| 优化点 | 方案 |
|---|---|
| 首屏加载 | 路由级代码分割（React.lazy），面试房间/报告页懒加载 |
| Bundle 体积 | manualChunks 拆分 react、monaco-editor、livekit-client、recharts |
| 字体 | 异步加载 Google Fonts，font-display: swap |
| 图片 | WebP 格式，懒加载 |
| 状态更新 | Zustand 选择器避免不必要重渲染，消息列表用 memo |
| 流式渲染 | AI 回复用增量更新，不整段重渲染 |
| PWA | Service Worker 缓存静态资源 + 音效，离线可访问报告 |
| Loading | 内联骨架屏在 index.html，JS 加载前就有反馈 |

---

## 9. 语音模块设计

### 9.1 STT（语音转文字）流程

```
用户点击麦克风 → 开始录音 (MediaRecorder, WebM/Opus)
    │
    ▼
用户再次点击 → 停止录音 → 获取 Blob
    │
    ▼
上传到后端 /api/v1/voice/stt (multipart)
    │
    ▼
后端调用 STT 服务
  ├─ OpenAI Whisper API (audio/transcriptions)
  └─ 阿里云一句话识别 (国内备选)
    │
    ▼
返回文字 → 前端填入输入框（用户可编辑）
    │
    ▼
用户点击发送 → 正常走 client:answer
```

### 9.2 TTS（文字转语音）流程

```
AI 生成文字回答
    │
    ▼
后端调用 TTS 服务生成音频
  ├─ Edge TTS (免费，edge-tts 库)
  └─ OpenAI TTS (高质量，付费)
    │
    ▼
音频保存为临时文件 / 返回 base64
    │
    ▼
通过 server:ai_speaking 事件推送音频 URL
    │
    ▼
前端播放音频，AI 头像显示说话动画
    │
    ▼
用户开始说话 → 自动停止播放 (打断)
```

### 9.3 语音模式特殊处理

- 回答超时：语音模式下用户回答超时从 120s 延长到 180s
- 录音限制：单次录音最长 120 秒，超过自动结束
- 音频格式：统一转 MP3/AAC 播放，WebM 录制
- 错误降级：STT 失败提示"语音识别失败，请切换文字输入"，不阻断面试

---

## 10. 代码面试模块设计

### 10.1 编辑器集成

- 使用 `@monaco-editor/react`
- 支持语言：Python、Java、C++、JavaScript
- 主题：vs-dark
- 功能：语法高亮、自动补全、括号匹配、快捷键
- 代码实时保存到 Zustand store

### 10.2 AI 代码评审

用户提交代码后，AI 评审节点（复用 evaluateNode，type=code）：

| 评审维度 | 说明 |
|---|---|
| 正确性 | 思路是否正确，能否通过典型测试用例 |
| 时间复杂度 | 是否达到最优，分析是否正确 |
| 空间复杂度 | 内存使用是否合理 |
| 边界条件 | 是否处理空输入、极值、非法输入 |
| 代码风格 | 命名、注释、结构是否清晰 |
| 优化建议 | 可以怎么改进 |

**评审 Prompt**：
```
请评审以下代码：

题目：{code_question_title}
{code_question_description}

候选人代码（{language}）：
{user_code}

请从以下维度评审：
1. 正确性：思路是否正确
2. 时间/空间复杂度分析
3. 边界条件处理
4. 代码风格
5. 优化建议
6. 参考解答（给出最优解代码）

输出JSON：
{
  "correctness": 0-10,
  "complexity": {"time": "O(?)", "space": "O(?)", "is_optimal": true/false},
  "edge_cases": ["处理了的边界", "遗漏的边界"],
  "style_comment": "...",
  "suggestions": ["建议1", "建议2"],
  "reference_solution": "最优解代码",
  "overall_score": 0-10
}
```

### 10.3 代码运行（可选，MVP 可不做）

- 方案：后端用 Docker 沙箱运行用户代码
- 限制：CPU 1核、内存 256MB、超时 10 秒
- 安全：只读文件系统，禁止网络，非 root 用户
- MVP 阶段可只做 AI 评审，不做真实运行（降低复杂度和安全风险）

---

## 11. 多 Agent 模式设计

### 11.1 双 Agent 架构

```
┌─────────────────────────────────────────────┐
│              LangGraph 主图                   │
│                                               │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │  面试官 Agent  │    │   观察员 Agent    │   │
│  │  (主流程)      │    │  (后台并行)       │   │
│  │               │    │                  │   │
│  │ 提问→评估→追问 │    │ 监听每条用户回答    │   │
│  │ →换题→总结    │    │ 记录行为数据       │   │
│  │               │    │ 记录表达问题       │   │
│  └──────────────┘    │ 记录技术漏洞       │   │
│                       └────────┬─────────┘   │
│                                │             │
│                                ▼             │
│                       state.observerNotes    │
│                                │             │
│                                ▼             │
│                       总结节点合并观察员点评   │
└─────────────────────────────────────────────┘
```

### 11.2 观察员实现

- 不独立建图，而是在 evaluateNode 中**并行调用**观察员 LLM
- 观察员不影响主流程，只写入 `state.observerNotes`
- 总结节点将观察员笔记整合到报告的 `observer_comment` 字段

**观察员 Prompt**：
```
你是一位面试观察员，负责客观记录候选人的表现，不参与提问。

当前问题：{current_question}
候选人回答：{user_answer}
回答时长：{answer_duration}秒
被追问次数：{followup_count}

请记录（简短，每条不超过30字）：
1. 表达问题（口头禅、停顿、逻辑混乱等）
2. 行为问题（不自信、回避、过于啰嗦等）
3. 技术漏洞（明显错误、概念混淆等）
4. 亮点（值得肯定的地方）

输出JSON数组：
["记录1", "记录2", ...]
```

---

## 12. 开发计划（14 天）

### 12.1 总览

| 阶段 | 天数 | 里程碑 | 关键交付物 |
|---|---|---|---|
| **第一阶段：基础搭建** | Day 1-2 | M1 | 项目骨架、用户系统、数据库、部署 |
| **第二阶段：面试核心** | Day 3-5 | M2 | LangGraph Agent、面试房间、实时问答、追问 |
| **第三阶段：报告闭环** | Day 6-7 | M3 | 报告生成、历史记录、数据看板、MVP上线 |
| **第四阶段：进阶功能** | Day 8-13 | M4 | RAG知识库、语音面试、代码面试、多Agent |
| **第五阶段：优化交付** | Day 14 | M5 | 性能优化、README、demo、用户反馈 |

### 12.2 每日详细计划

#### Day 1：项目初始化 + 数据库 + 用户系统

**目标**：项目能跑起来，能注册登录，数据库表建好

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | pnpm monorepo 初始化（shared/client/server 三包） | ⚠️ 包依赖关系正确，shared 能被 client/server 引用 | `pnpm dev` 能同时启动前后端 |
| 上午 | 数据库设计 + Drizzle schema + 迁移 | ⚠️ 所有 9 张表创建成功，字段类型正确 | `db:migrate` 执行成功，表结构符合设计 |
| 下午 | 用户系统：注册/登录/JWT/bcrypt | ⚠️ 密码加密存储，JWT 7天有效，中间件鉴权 | 能注册、登录、访问受保护接口 |
| 下午 | 前端：登录/注册页面 + 路由 + AuthStore | - | 前端能登录，token 存 localStorage，刷新保持登录 |
| 晚上 | Docker 配置 + 本地 docker-compose 跑通 | ⚠️ PostgreSQL + Redis + 后端 + 前端 一键启动 | `docker compose up` 后全服务可用 |

**Vibe Coding 起手 prompt**：
```
帮我创建一个 AI 面试模拟平台 "Interview Copilot" 的项目骨架。
pnpm monorepo，三个包：
- shared: TypeScript 类型定义 + WebSocket 协议 + 常量
- client: React 19 + Vite + Tailwind CSS 4 + Zustand + TypeScript
- server: Hono.js + ws + Drizzle ORM + PostgreSQL + Redis + tsx

要求：
1. monorepo 配置正确，shared 包能被 client 和 server 引用
2. 数据库用 Drizzle ORM，创建所有表（users/resumes/knowledge_bases/knowledge_docs/
   knowledge_chunks/interviews/messages/evaluations/reports/user_stats）
   knowledge_chunks 表使用 pgvector 扩展
3. 用户系统：注册/登录/JWT(7天)/bcrypt，认证中间件
4. 前端：登录页/注册页/路由/受保护路由/AuthStore
5. Docker: docker-compose.yml 包含 postgres + redis + server + client
6. 所有 TypeScript 严格模式，shared 包导出所有类型和协议定义

先输出项目结构和关键文件内容，我确认后再生成完整代码。
```

#### Day 2：简历管理 + 面试创建 + 部署

**目标**：能上传简历，能创建面试，部署到公网

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | 简历上传：PDF/DOCX 解析 + 结构化提取 | ⚠️ pdf-parse/mammoth 提取文本，AI 辅助结构化（教育/经历/项目/技能） | 上传 PDF 后能看到解析结果，可手动编辑 |
| 上午 | 简历管理页面：列表/上传/编辑/删除/设默认 | - | 完整 CRUD |
| 下午 | 面试创建：配置表单（岗位/难度/时长/性格/简历选择） | ⚠️ 5+ 岗位方向预设，配置保存到 interviews 表 | 能创建面试，状态为 created |
| 下午 | 面试列表页 + 面试详情页 | - | 能看到创建的面试 |
| 晚上 | 部署到 Railway：Docker 部署 + 环境变量 + 域名 | ⚠️ 公网可访问，HTTPS，数据库连接正常 | 浏览器访问域名能注册登录 |

#### Day 3：LangGraph Agent 骨架 + WebSocket 连接

**目标**：LangGraph 状态图跑通，WebSocket 能连接

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | LangGraph 状态定义（InterviewState） | ⚠️ 所有字段定义完整，类型安全 | State 能正常初始化和更新 |
| 上午 | LangGraph 状态图构建（8个节点 + 条件边） | ⚠️⚠️ **核心中的核心**：条件边 afterEvaluate 逻辑正确 | 图能 compile，能从 START 走到 END |
| 下午 | 开场节点 + 提问节点（简化版，固定问题） | - | 执行图能输出开场和问题 |
| 下午 | WebSocket 服务端：连接管理 + 认证 + 房间管理 | ⚠️ 连接时验证 token + interviewId 归属，房间状态存 Redis | 客户端能连接，收到 server:connected |
| 晚上 | WebSocket 客户端封装 + 面试房间基础 UI | - | 前端能连接 WS，显示连接状态 |

#### Day 4：面试核心流程（提问→回答→评估→追问→换题）

**目标**：完整跑通一场文字面试

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | 提问节点完善：基于简历+岗位生成问题，流式输出 | ⚠️ Prompt 模板质量，流式通过 WebSocket 推送 delta | AI 能生成相关问题，前端显示打字机效果 |
| 上午 | 评估节点：多维度评分 + JSON 输出校验 | ⚠️ zod 校验，失败重试，评分维度正确 | 回答后能生成评分（前端不可见） |
| 下午 | 条件边决策：评估后决定追问/换题/总结 | ⚠️⚠️ afterEvaluate 逻辑：评分<6且追问<2→追问，否则换题，时间到→总结 | 回答差时 AI 自动追问，回答好时换下一题 |
| 下午 | 追问节点：基于薄弱点生成追问 | - | 追问内容针对回答中的薄弱点 |
| 晚上 | 前端面试房间：对话区+问题卡片+输入区+计时器 | ⚠️ 流式消息渲染，计时器同步，状态管理正确 | 能在前端完成一场 5 题的面试 |

#### Day 5：面试流程完善 + 异常处理

**目标**：面试流程稳定，异常情况有处理

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | 反问节点 + 总结节点（报告生成逻辑） | ⚠️ 总结节点计算总分/维度分/薄弱点/建议，保存到 reports 表 | 面试结束能生成报告数据 |
| 上午 | 面试结束流程：主动结束/超时结束/断线结束 | ⚠️ 三种结束方式都能正确触发总结节点 | 各种结束方式都能生成报告 |
| 下午 | 断线重连：30秒内重连恢复会话 | ⚠️ 会话状态存 Redis，重连后恢复消息和状态 | 刷新页面后能恢复面试 |
| 下午 | 心跳机制 + 超时处理 | - | 60秒无心跳断开，用户120秒未回答提示跳过 |
| 晚上 | 端到端测试：完整跑 3 场面试，记录 bug | - | 核心流程无阻断性 bug |

#### Day 6：报告页 + 历史记录

**目标**：报告可视化，历史可查

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | 报告页：总分+雷达图+各维度评分 | ⚠️ Recharts 雷达图，数据从 reports 表读取 | 报告页展示完整评分 |
| 上午 | 报告页：逐题回顾（问题+回答+点评+示范回答） | - | 能展开查看每道题的详情 |
| 下午 | 报告页：薄弱点分析 + 改进建议 + 整体评价 | - | 薄弱点按频率排序，建议具体可执行 |
| 下午 | 报告导出 PDF + 分享链接 | - | 能下载 PDF，能生成只读分享链接 |
| 晚上 | 历史记录页：列表+筛选+搜索 | - | 能看到所有历史面试，点击查看报告 |

#### Day 7：数据看板 + MVP 上线

**目标**：个人数据可视化，MVP 完整上线

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | 个人统计：user_stats 表更新逻辑 + 统计接口 | ⚠️ 每场面试结束后更新统计，分数历史保留最近 20 条 | 统计数据准确 |
| 上午 | 数据看板：总览卡片+分数趋势图+维度趋势+薄弱点排行 | - | 看板展示个人数据 |
| 下午 | 性能优化：代码分割+Bundle 优化+首屏 loading | ⚠️ 首屏 ≤3s，AI 首字 ≤5s | Lighthouse 性能分 ≥80 |
| 下午 | PWA：manifest + Service Worker | - | 可安装到桌面，离线可看报告 |
| 晚上 | MVP 上线验收：跑通完整流程，修复关键 bug | ⚠️ 注册→上传简历→创建面试→完成面试→查看报告 100% 跑通 | MVP 可交付，邀请同学试用 |

#### Day 8-9：RAG 知识库

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| Day8 上午 | 文档摄入：上传+文本提取+语义分块 | ⚠️ 按标题分块，500-1000 token，重叠 100 | 上传 PDF 后能看到分块结果 |
| Day8 下午 | Embedding + pgvector 存储 + 异步处理 | ⚠️ 批量 embedding，状态轮询 | 文档状态从 processing→completed |
| Day8 晚上 | 知识库管理页面 | - | 能创建知识库、上传文档、查看状态、删除 |
| Day9 上午 | 混合检索：向量检索 + BM25 + Rerank | ⚠️ 混合检索取 Top5，Rerank 提升相关性 | 检索结果与 query 相关度高 |
| Day9 下午 | 提问节点集成 RAG：基于知识库出题 | ⚠️ 检索结果作为 context，题目标注来源 | 选择知识库后，题目与知识库内容相关 |
| Day9 晚上 | 测试 + bug 修复 | - | RAG 功能稳定可用 |

#### Day 10-11：语音面试

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| Day10 上午 | STT：前端录音 + 后端 Whisper API 转文字 | ⚠️ MediaRecorder 录音，上传转文字，可编辑 | 语音输入能正确转文字 |
| Day10 下午 | TTS：AI 回答转语音播放 | ⚠️ Edge TTS 免费方案，音频流式播放 | AI 回答能语音播放 |
| Day10 晚上 | 语音控制 UI：麦克风按钮+波形动画+播放控制 | - | 语音模式界面完整 |
| Day11 上午 | 打断功能：用户说话自动停止 AI 播放 | ⚠️ VAD 语音活动检测，自动打断 | 用户开始说话时 AI 语音停止 |
| Day11 下午 | 语音模式适配：超时延长+录音限制+错误降级 | - | 语音模式稳定，错误有降级 |
| Day11 晚上 | 测试 + bug 修复 | - | 语音面试可用 |

#### Day 12-13：代码面试 + 多 Agent

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| Day12 上午 | Monaco Editor 集成 + 代码题节点 | ⚠️ 编辑器功能完整，AI 能出算法题 | 能在面试中出现代码题，可在线写代码 |
| Day12 下午 | AI 代码评审：正确性/复杂度/边界/风格 | ⚠️ 评审维度完整，有参考解答 | 提交代码后能看到详细评审 |
| Day12 晚上 | 代码面试 UI 整合 | - | 代码面试模式界面完整 |
| Day13 上午 | 多 Agent：观察员 Agent 并行记录 | ⚠️ 观察员不影响主流程，记录写入 state | 多 Agent 模式下观察员正常记录 |
| Day13 下午 | 报告整合观察员点评 + 行为数据 | - | 报告含观察员第三方点评 |
| Day13 晚上 | 全功能回归测试 | - | 所有功能无阻断性 bug |

#### Day 14：优化 + 交付

| 时间 | 任务 | 关键节点 | 验收标准 |
|---|---|---|---|
| 上午 | 最终性能优化 + 安全检查 | ⚠️ 首屏≤3s，接口鉴权完整，无 XSS/SQL 注入 | 安全扫描无高危漏洞 |
| 上午 | README 编写：项目介绍+架构图+技术栈+快速开始+截图 | - | README 完整专业 |
| 下午 | 录 demo 视频（1-3分钟）+ 写项目介绍文章 | - | 有 demo 视频和文章 |
| 下午 | 邀请 5-10 位同学试用，收集反馈 | - | 有真实用户反馈 |
| 晚上 | 修复反馈中的关键问题 + 最终部署 | - | 最终版本上线 |

### 12.3 关键节点汇总（必须重点关注）

| 编号 | 关键节点 | 所在天 | 风险等级 | 说明 |
|---|---|---|---|---|
| K1 | monorepo 三包依赖正确 | Day1 | 中 | shared 包引用问题会导致后续所有开发受阻 |
| K2 | 数据库表结构设计 | Day1 | 中 | 表结构不合理后续迁移成本高 |
| K3 | 简历解析结构化 | Day2 | 中 | AI 解析质量不稳定，需要人工编辑兜底 |
| K4 | **LangGraph 状态图 + 条件边** | Day3 | ⚠️ 高 | **项目核心技术，条件边逻辑错误会导致面试流程混乱** |
| K5 | WebSocket 连接 + 认证 + 房间管理 | Day3 | 中 | 连接不稳定会影响实时体验 |
| K6 | **评估节点评分 + JSON 校验** | Day4 | ⚠️ 高 | LLM 输出格式不稳定，必须有校验和重试机制 |
| K7 | **条件边决策逻辑（追问/换题/总结）** | Day4 | ⚠️ 高 | **决定面试是否智能，是最大亮点也是最大风险** |
| K8 | 流式输出前端渲染 | Day4 | 中 | 流式渲染处理不好会导致界面闪烁 |
| K9 | 断线重连会话恢复 | Day5 | 中 | Redis 状态序列化/反序列化 |
| K10 | 报告生成逻辑（总分/薄弱点/建议） | Day5 | 中 | 报告质量直接影响用户体验 |
| K11 | RAG 混合检索质量 | Day9 | 中 | 检索不相关会导致题目质量下降 |
| K12 | 语音 STT/TTS 稳定性 | Day10-11 | 中 | 第三方 API 稳定性不可控 |
| K13 | 部署 + 环境变量 + 域名 | Day2/14 | 低 | Railway 部署相对简单 |

---

## 13. 部署方案

### 13.1 部署架构

```
                    ┌─────────────┐
                    │   用户浏览器  │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │   Railway    │
                    │  (反向代理)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌───▼────┐ ┌────▼─────┐
       │  Frontend   │ │ Server │ │  Static  │
       │  (Vite 构建) │ │(Hono)  │ │  Assets  │
       └──────┬──────┘ └───┬────┘ └──────────┘
              │              │
       ┌──────▼──────┐ ┌────▼─────┐
       │  PostgreSQL  │ │  Redis   │
       │  + pgvector  │ │ (缓存)    │
       └─────────────┘ └──────────┘
```

### 13.2 Railway 部署步骤

1. **创建 Railway 项目**，连接 GitHub 仓库
2. **添加服务**：
   - PostgreSQL（Railway 内置，自动配置连接字符串）
   - Redis（Railway 内置）
   - Server（Dockerfile 部署，端口 3001）
3. **前端部署**：
   - 方案 A：构建为静态文件，由 Server 托管（生产模式下 server serve client dist）
   - 方案 B：单独部署到 Vercel（CDN 加速，推荐）
4. **环境变量**（在 Railway  dashboard 配置）：
   ```
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   JWT_SECRET=your-secret-key
   DEEPSEEK_API_KEY=sk-xxx
   ANTHROPIC_API_KEY=sk-xxx (可选)
   LIVEKIT_URL=wss://... (可选，语音用)
   LIVEKIT_API_KEY=... (可选)
   LIVEKIT_API_SECRET=... (可选)
   ```
5. **数据库初始化**：部署后自动执行 `db:migrate`
6. **域名**：Railway 自动分配 `xxx.up.railway.app`，可绑定自定义域名
7. **HTTPS**：Railway 自动提供

### 13.3 Dockerfile

```dockerfile
# packages/server/Dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY packages/client ./packages/client
COPY packages/server ./packages/server
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @interview-copilot/shared build
RUN pnpm --filter @interview-copilot/client build
RUN pnpm --filter @interview-copilot/server build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/server ./packages/server
COPY --from=builder /app/packages/client/dist ./packages/client/dist
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile
EXPOSE 3001
CMD ["pnpm", "--filter", "@interview-copilot/server", "start"]
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

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://interview:interview@postgres:5432/interview_copilot
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-in-production
    depends_on:
      - postgres
      - redis

volumes:
  pgdata:
```

---

## 14. 风险识别与应对

| 编号 | 风险 | 概率 | 影响 | 应对策略 |
|---|---|---|---|---|
| R1 | **LangGraph 条件边逻辑复杂，调试困难** | 高 | 高 | 先写单元测试验证条件边逻辑；每个节点独立测试；用 LangGraph 的可视化工具查看图结构；条件边函数纯函数化，方便测试 |
| R2 | **LLM 输出格式不稳定（JSON 解析失败）** | 高 | 中 | 所有 LLM 输出用 zod 校验；失败自动重试（最多2次）；重试时在 prompt 中强调格式；仍失败用规则兜底（评分取默认值，点评用模板） |
| R3 | **LLM API 延迟高，用户等待久** | 中 | 中 | 流式输出（首字≤5s）；评分节点异步执行（不阻塞提问）；用更快的模型（Haiku 而非 Sonnet）做评分；缓存常见问题 |
| R4 | **LLM API 成本超预算** | 中 | 低 | 提问用 DeepSeek（便宜），评分用 Claude Haiku（便宜）；限制单场面试 token 用量；设置每日 API 调用上限；监控用量 |
| R5 | **WebSocket 连接不稳定** | 中 | 中 | 心跳机制（30s ping）；自动重连（指数退避，最多5次）；断线 30s 内可恢复；关键状态存 Redis+数据库双写 |
| R6 | **RAG 检索质量差，题目不相关** | 中 | 中 | 混合检索（向量+关键词）；Rerank 二次排序；语义分块而非固定长度；检索阈值过滤低相似度；用户可反馈题目质量，用于优化 |
| R7 | **简历解析不准确** | 中 | 低 | 提供人工编辑界面；解析结果标注置信度；支持纯文本粘贴作为兜底 |
| R8 | **语音识别准确率低** | 中 | 低 | 提供文字编辑（转文字后可修改）；错误降级为文字输入；提示用户在安静环境使用 |
| R9 | **Monaco Editor 包体积大** | 低 | 中 | 懒加载（只有代码面试时才加载）；manualChunks 单独打包；CDN 加载 |
| R10 | **并发用户数超过服务器承载** | 低 | 中 | MVP 限制 20 并发；后端无状态可水平扩展；Redis 做会话共享；数据库连接池 |
| R11 | **AI 生成不当内容（敏感/歧视）** | 低 | 高 | Prompt 中加入安全约束；输出内容过滤（敏感词检测）；用户举报机制；面试场景相对安全（技术问题） |
| R12 | **开发时间不够，功能做不完** | 中 | 中 | 严格按优先级：P0 功能必须完成，P1 功能尽量完成，P2 可延后；MVP 先上线再迭代；每天检查进度，落后时砍非核心功能 |

---

## 15. 质量保障

### 15.1 测试策略

| 测试类型 | 范围 | 工具 | 优先级 |
|---|---|---|---|
| 单元测试 | LangGraph 节点、条件边函数、评分计算、分块逻辑 | Vitest | P0 |
| 集成测试 | API 接口（注册/登录/创建面试/报告）、数据库操作 | Vitest + supertest | P0 |
| WebSocket 测试 | 连接/消息/断线重连/流式输出 | 手动 + 脚本 | P1 |
| 端到端测试 | 完整面试流程（注册→面试→报告） | Playwright | P1 |
| 性能测试 | 首屏加载、API 响应、并发 | Lighthouse + k6 | P1 |
| 安全测试 | SQL 注入、XSS、越权访问、认证绕过 | 手动 + 工具扫描 | P0 |

### 15.2 代码质量

- ESLint + typescript-eslint，pre-commit 钩子
- Prettier 格式化
- TypeScript 严格模式，禁止 any
- Code Review（自己 review AI 生成的代码）
- 关键模块（LangGraph、评分、安全）必须人工审查

### 15.3 AI 生成代码审查清单

AI 生成代码后，必须人工检查：

- [ ] 安全性：无 SQL 注入、无 XSS、无硬编码密钥、权限校验完整
- [ ] 正确性：逻辑正确，边界条件处理，无明显 bug
- [ ] 性能：无 N+1 查询，无内存泄漏，异步操作正确
- [ ] 类型：TypeScript 类型正确，无 any，无类型断言滥用
- [ ] 错误处理：异常有捕获，错误信息对用户友好
- [ ] 可维护性：代码结构清晰，命名合理，无重复代码

### 15.4 上线前检查清单

- [ ] 核心流程 100% 跑通（注册→上传简历→创建面试→完成面试→查看报告）
- [ ] 所有 P0 功能完成并测试
- [ ] 性能达标（首屏≤3s，AI首字≤5s）
- [ ] 安全检查通过（无高危漏洞）
- [ ] 环境变量正确配置（生产环境用强密钥）
- [ ] 数据库备份策略配置
- [ ] 日志可查，错误有告警
- [ ] README 完整，有快速开始指南
- [ ] 有 demo 视频或截图
- [ ] 至少 3 位真实用户试用过

---

## 16. Vibe Coding 执行策略

### 16.1 工具链

| 工具 | 用途 | 配置 |
|---|---|---|
| **Claude Code CLI** | 主力编程工具 | Opus 4.6 / Sonnet 4.5，1M context |
| **Superpowers Skills** | 规划+执行规范 | brainstorming 模式先对齐方案 |
| **Playwright MCP** | AI 自主测试 | 让 AI 自己跑流程、截图验证 |
| **Context7 MCP** | 最新 API 文档 | 防止 AI 写过时的 API（Tailwind v4、LangGraph 新版等） |
| **Cursor** | 辅助编辑 | 局部修改、代码审查时用 |

### 16.2 开发流程规范

```
每个功能模块的开发循环：

1. 【规划】让 AI 用 Superpowers brainstorming 写 spec + plan
   → 你人工确认方案，调整不合理的地方

2. 【执行】让 AI 按 plan 逐步实现
   → 每个子步骤完成后检查结果
   → 遇到 AI 不懂的新技术，用 Context7 拉文档

3. 【验证】让 AI 用 Playwright 自己跑测试
   → 核心流程必须 AI 自主验证通过
   → 你手动补充边界 case 测试

4. 【审查】你人工 code review
   → 按 15.3 清单检查
   → 关键模块（LangGraph/安全/评分）必须细看

5. 【提交】git commit，压缩上下文
   → 完成一个大模块后 /compact
   → 再开始下一个模块
```

### 16.3 Prompt 编写原则

1. **先给上下文**：项目背景、技术栈、已有代码结构
2. **明确需求**：做什么、不做什么、验收标准
3. **指定约束**：用什么库、什么模式、什么文件结构
4. **要求输出格式**：先输出方案让我确认，再生成代码
5. **分步执行**：大任务拆成小步骤，每步确认后再继续
6. **提供示例**：关键逻辑给示例代码或示例输出

### 16.4 上下文管理

- 每个大模块开始前 `/compact` 压缩之前的上下文
- 用 `/btw` 询问新技术（不记入主上下文）
- 共享类型定义放在 shared 包，AI 可以直接引用，不需要重复描述
- 数据库 schema 用 Drizzle 定义一次，AI 可以读取
- 长文档（如本实施文档）可以让 AI 读取文件，不要全部贴在对话里

### 16.5 常见问题应对

| 问题 | 应对 |
|---|---|
| AI 生成的代码跑不起来 | 把报错信息完整贴给 AI，让它分析修复；超过 2 次失败则换思路或手动修 |
| AI 过度设计（加了不需要的功能） | 明确告诉它"只做 XXX，其他不要"；在 prompt 中列出"不做什么" |
| AI 改了不该改的文件 | 用 git diff 检查，回滚无关修改；prompt 中明确"只修改 XXX 文件" |
| AI 用了过时的 API | 用 Context7 MCP 拉最新文档；或直接告诉它"用 XX 库的 YY 版本，API 是 ZZZ" |
| AI 写的 prompt 模板质量差 | 人工修改 prompt 模板，这是核心资产，不能完全依赖 AI |
| 上下文太长 AI 变笨 | `/compact` 压缩；关键信息写到文件里让 AI 读取；开新会话时带上项目摘要 |

---

> **文档结束**
>
> 本文档与《Interview Copilot PRD v1.0》配套使用。
>
> 开发过程中如遇设计变更，应同步更新本文档并记录变更原因。
