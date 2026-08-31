# Interview Copilot — AI 面试模拟助手

> 基于 LangGraph + FastAPI + React 的全栈 AI 面试模拟平台，秋招简历项目

## 项目亮点

- **LangGraph 状态机驱动**：8个节点 + 条件边，支持 interrupt() 人机协同、Checkpoint 状态持久化
- **智能追问机制**：AI 评估回答后自动识别薄弱点，生成针对性追问
- **多维度评分体系**：技术深度/表达逻辑/应变能力/基础知识 四维评分 + 雷达图可视化
- **RAG 知识库**：上传学习资料，AI 面试时参考知识库内容出题
- **实时流式对话**：WebSocket + 流式输出，打字机效果
- **代码面试模式**：在线代码编辑器 + AI 代码评审
- **完整面试报告**：逐题回顾 + 薄弱点分析 + 提升建议

## 技术栈

### 后端
- **FastAPI** 0.115 — 异步 Web 框架
- **LangGraph** 0.2 — Agent 状态图编排
- **LangChain** 0.3 — LLM 应用框架
- **SQLAlchemy 2.0** — 异步 ORM
- **SQLite**（开发）/ **PostgreSQL**（部署）
- **Chroma**（开发）/ **pgvector**（部署）— 向量数据库
- **WebSocket** — 实时通信
- **JWT + bcrypt** — 认证安全

### 前端
- **React 19** + **TypeScript**
- **Vite 5** — 构建工具
- **Tailwind CSS 4** — 样式
- **Zustand** — 状态管理
- **React Router 6** — 路由
- **Recharts** — 数据可视化
- **Lucide React** — 图标

## 快速开始

### 1. 环境要求
- Python 3.11+（推荐 3.12）
- Node.js 18+
- pnpm 或 npm

### 2. 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
copy .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY 或 OPENAI_API_KEY

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API 文档：http://localhost:8000/docs

### 3. 前端启动

```bash
cd frontend

# 安装依赖
pnpm install
# 或 npm install

# 启动开发服务器
pnpm dev
# 或 npm run dev
```

访问：http://localhost:5173

### 4. 配置 LLM API Key

在 `backend/.env` 中配置：

```env
# DeepSeek（推荐，性价比高）
DEEPSEEK_API_KEY=sk-xxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 或 OpenAI
OPENAI_API_KEY=sk-xxxxxxxx
```

> 没有 API Key 也能运行，AI 回复会使用内置 Mock 数据，方便测试流程。

## 项目结构

```
ai面试助手/
├── backend/
│   ├── app/
│   │   ├── agent/              # LangGraph 面试 Agent（核心）
│   │   │   ├── state.py        # 状态定义（TypedDict）
│   │   │   ├── graph.py        # 状态图构建（8节点+条件边）
│   │   │   ├── manager.py      # Agent 管理器
│   │   │   ├── llm.py          # LLM 封装（多提供商+Mock）
│   │   │   └── nodes/          # 8个图节点
│   │   │       ├── opening.py      # 开场
│   │   │       ├── question.py     # 提问（含 interrupt）
│   │   │       ├── evaluate.py     # 评估（Pydantic 解析+重试）
│   │   │       ├── followup.py     # 追问（含 interrupt）
│   │   │       ├── code_question.py # 代码题
│   │   │       ├── reverse.py      # 反问
│   │   │       └── summary.py      # 总结+报告
│   │   ├── api/                # REST API 路由
│   │   ├── ws/                 # WebSocket 实时通信
│   │   ├── rag/                # RAG 知识库
│   │   ├── db/                 # 数据库模型
│   │   ├── schemas/            # Pydantic 数据模型
│   │   ├── services/           # 业务服务
│   │   ├── core/               # 核心（安全/依赖/异常）
│   │   └── main.py             # FastAPI 入口
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   │   ├── InterviewRoom.tsx   # 面试房间（核心）
│   │   │   ├── Report.tsx          # 面试报告
│   │   │   ├── Dashboard.tsx       # 首页
│   │   │   ├── CreateInterview.tsx # 创建面试
│   │   │   ├── Resume.tsx          # 简历管理
│   │   │   ├── History.tsx         # 历史记录
│   │   │   └── Knowledge.tsx       # 知识库
│   │   ├── stores/             # Zustand 状态
│   │   ├── lib/                # API + WebSocket 客户端
│   │   └── components/         # 通用组件
│   └── package.json
├── Interview-Copilot-PRD.md        # 产品需求文档
└── Interview-Copilot-Impl-Python.md # 技术实施文档
```

## LangGraph 状态图设计

```
START → opening → question → evaluate ──┬── followup → evaluate（循环）
                                          ├── question（下一题）
                                          ├── code（代码题）
                                          ├── reverse（反问）
                                          └── summary → END
```

**核心机制**：
- `question` 节点调用 `interrupt()` 暂停图，等待用户回答
- 用户通过 WebSocket 提交回答，`Command(resume=answer)` 恢复图
- `evaluate` 节点评估后，条件边 `after_evaluate` 根据分数/时间决定下一步
- `Checkpoint` 自动持久化状态，支持断点续面

## API 概览

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | POST /api/v1/auth/register | 注册 |
| 认证 | POST /api/v1/auth/login | 登录 |
| 简历 | GET/POST /api/v1/resumes | 简历列表/上传 |
| 面试 | POST /api/v1/interviews | 创建面试 |
| 面试 | POST /api/v1/interviews/{id}/start | 启动面试 |
| 面试 | GET /api/v1/interviews/{id}/report | 获取报告 |
| 知识库 | GET/POST /api/v1/knowledge-bases | 知识库管理 |
| WebSocket | /ws/interview/{id} | 实时面试通信 |

## 面试流程

1. **注册/登录** → 上传简历
2. **创建面试** → 选择岗位、难度、时长、面试官风格
3. **开始面试** → AI 开场 → 自我介绍
4. **技术问答** → AI 提问 → 用户回答 → AI 评估 → 智能追问/下一题
5. **代码题**（可选）→ 在线编码 → AI 代码评审
6. **反问环节** → 用户向 AI 提问
7. **面试结束** → 生成完整报告（雷达图 + 逐题回顾 + 薄弱点 + 建议）

## 部署

### Docker 部署（生产环境）

```bash
# 使用 PostgreSQL + pgvector
docker-compose up -d
```

### 开发环境
- 数据库：SQLite（无需安装）
- 向量库：Chroma（本地文件）
- 缓存：可选 Redis

## 简历亮点写法

> 基于 LangGraph 构建多节点状态机驱动的 AI 面试模拟系统，实现 interrupt() 人机协同、条件边智能路由、Checkpoint 状态持久化；集成 RAG 知识库、多维度评分体系、WebSocket 流式对话；支持代码面试模式和 AI 代码评审。

## License

MIT
