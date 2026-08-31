# Interview Copilot 部署指南

> 本指南介绍如何将 Interview Copilot 部署到公网，使用 **Vercel（前端）+ Render（后端）** 的免费方案。

---

## 目录

1. [准备工作](#1-准备工作)
2. [推送代码到 GitHub](#2-推送代码到-github)
3. [部署后端到 Render](#3-部署后端到-render)
4. [部署前端到 Vercel](#4-部署前端到-vercel)
5. [配置环境变量](#5-配置环境变量)
6. [验证部署](#6-验证部署)
7. [常见问题](#7-常见问题)

---

## 1. 准备工作

### 1.1 注册账号

| 平台 | 地址 | 说明 |
|------|------|------|
| GitHub | https://github.com | 代码托管，用 GitHub 账号登录其他平台 |
| Vercel | https://vercel.com | 前端部署，免费额度够用 |
| Render | https://render.com | 后端部署，免费 750 小时/月 |

### 1.2 准备密钥

- **DeepSeek API Key**：https://platform.deepseek.com/ （已有）
- **JWT 密钥**：本地生成一个强随机字符串
  ```bash
  # Windows PowerShell
  -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 256) })
  
  # Mac/Linux
  openssl rand -hex 32
  ```

---

## 2. 推送代码到 GitHub

### 2.1 初始化 Git 仓库

在项目根目录 `D:\experiment\vibe coding\ai面试助手` 下执行：

```bash
# 初始化 git
git init

# 添加所有文件（.gitignore 会自动排除敏感文件）
git add .

# 提交
git commit -m "Initial commit: Interview Copilot AI 面试模拟助手"

# 重命名主分支为 main
git branch -M main
```

### 2.2 创建 GitHub 仓库

1. 登录 GitHub，点击右上角 `+` → `New repository`
2. 仓库名：`interview-copilot`（或你喜欢的名字）
3. 描述：`AI 面试模拟助手 - 基于大语言模型的模拟面试平台`
4. 选择 `Public`（公开，方便面试官查看）
5. **不要**勾选 "Initialize this repository with"（已经有本地代码了）
6. 点击 `Create repository`

### 2.3 推送代码

```bash
# 添加远程仓库（替换为你的 GitHub 用户名和仓库名）
git remote add origin https://github.com/你的用户名/interview-copilot.git

# 推送
git push -u origin main
```

> 如果提示认证，使用 GitHub Personal Access Token（PAT）作为密码。

---

## 3. 部署后端到 Render

### 3.1 创建 Web Service

1. 登录 Render，点击右上角 `New +` → `Web Service`
2. 选择 `Build and deploy from a Git repository`
3. 连接你的 GitHub 账号，选择 `interview-copilot` 仓库
4. 配置如下：

| 配置项 | 值 |
|--------|-----|
| **Name** | `interview-copilot-api`（自定义，会成为子域名） |
| **Region** | `Singapore`（新加坡，离国内近） |
| **Branch** | `main` |
| **Root Directory** | `backend`（重要！后端代码在 backend 子目录） |
| **Runtime** | `Docker`（自动识别 Dockerfile） |
| **Instance Type** | `Free`（免费版） |

5. 点击 `Create Web Service`

### 3.2 配置环境变量

在 Render 后台 → 你的服务 → `Environment` 页面，添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `APP_ENV` | `production` | 生产环境 |
| `DEBUG` | `false` | 关闭调试 |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/interview.db` | SQLite 数据库 |
| `JWT_SECRET` | 你生成的 32 位随机字符串 | JWT 签名密钥 |
| `JWT_EXPIRE_DAYS` | `7` | Token 有效期 |
| `CORS_ORIGINS` | `https://你的前端名.vercel.app` | 前端域名（部署前端后再填） |
| `DEEPSEEK_API_KEY` | 你的 DeepSeek API Key | AI 接口密钥 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` | DeepSeek 接口地址 |
| `CHROMA_PERSIST_DIR` | `./data/chroma` | 向量库存储路径 |

> ⚠️ `CORS_ORIGINS` 先随便填一个，等前端部署完成后再改成真实的前端域名。

### 3.3 添加持久化磁盘（可选但推荐）

免费版 Render 的文件系统在重新部署后会重置，SQLite 数据库和上传的简历会丢失。建议添加持久化磁盘：

1. Render 后台 → 你的服务 → `Disks` → `Add Disk`
2. 配置：
   - **Name**：`data`
   - **Mount Path**：`/app/data`
   - **Size**：`1 GB`（免费版最多 1GB）
3. 点击 `Create`

> 添加磁盘后，服务会自动重启。数据库和上传文件会持久化保存。

### 3.4 等待部署完成

- 首次部署需要 3-5 分钟（构建 Docker 镜像）
- 部署成功后，服务地址为：`https://interview-copilot-api.onrender.com`
- 验证：访问 `https://interview-copilot-api.onrender.com/health`，应该返回 `{"status":"ok"}`

> ⚠️ 免费版 15 分钟无请求会休眠，首次访问需要等 10-20 秒唤醒。

---

## 4. 部署前端到 Vercel

### 4.1 导入项目

1. 登录 Vercel，点击 `Add New...` → `Project`
2. 选择 `interview-copilot` 仓库，点击 `Import`
3. 配置如下：

| 配置项 | 值 |
|--------|-----|
| **Project Name** | `interview-copilot`（自定义，会成为子域名） |
| **Framework Preset** | `Vite`（自动识别） |
| **Root Directory** | `frontend`（重要！前端代码在 frontend 子目录） |
| **Build Command** | `npm run build`（自动识别） |
| **Output Directory** | `dist`（自动识别） |

### 4.2 配置环境变量

在 `Environment Variables` 部分添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_API_BASE_URL` | `https://interview-copilot-api.onrender.com/api/v1` | 后端 API 地址（替换为你的 Render 地址） |

> `VITE_WS_BASE_URL` 可以不填，会自动从 API 地址推导。

### 4.3 部署

点击 `Deploy`，等待 1-2 分钟部署完成。

部署成功后，前端地址为：`https://interview-copilot.vercel.app`

### 4.4 更新后端 CORS

部署完成后，回到 Render 后台：
1. 你的服务 → `Environment`
2. 把 `CORS_ORIGINS` 改成你的前端域名：`https://interview-copilot.vercel.app`
3. 保存后服务会自动重启

---

## 5. 配置环境变量汇总

### 5.1 Render（后端）环境变量

```bash
APP_ENV=production
DEBUG=false
DATABASE_URL=sqlite+aiosqlite:///./data/interview.db
JWT_SECRET=你的32位随机密钥
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7
CORS_ORIGINS=https://你的前端名.vercel.app
DEEPSEEK_API_KEY=你的DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
CHROMA_PERSIST_DIR=./data/chroma
```

### 5.2 Vercel（前端）环境变量

```bash
VITE_API_BASE_URL=https://你的后端名.onrender.com/api/v1
```

---

## 6. 验证部署

### 6.1 后端验证

访问 `https://你的后端名.onrender.com/health`，应该返回：
```json
{"status":"ok","version":"2.0.0","env":"production"}
```

### 6.2 前端验证

访问 `https://你的前端名.vercel.app`，应该能看到登录页面。

### 6.3 完整流程测试

1. 注册一个新账号
2. 上传一份简历（PDF 或文本）
3. 创建一场面试（选择岗位、难度）
4. 进入面试房间，测试 AI 问答
5. 结束面试，查看报告
6. 测试报告分享链接（在无痕窗口打开）

---

## 7. 常见问题

### Q1: 后端首次访问很慢？

A: Render 免费版 15 分钟无请求会休眠，首次访问需要 10-20 秒唤醒。可以用 UptimeRobot（免费）每 5 分钟 ping 一次，保持唤醒。

### Q2: 上传的简历/数据库丢失了？

A: 免费版 Render 重新部署后文件系统会重置。需要添加持久化磁盘（见 3.3 节），挂载到 `/app/data`。

### Q3: 前端能打开，但接口报 CORS 错误？

A: 检查 Render 的 `CORS_ORIGINS` 环境变量是否配置正确，必须包含你的前端域名（不要末尾斜杠）。修改后需要重启服务。

### Q4: WebSocket 连接失败？

A: 检查 `VITE_API_BASE_URL` 是否正确，WebSocket 地址会自动从 API 地址推导（http→ws，https→wss）。Render 支持 WebSocket。

### Q5: AI 回复很慢或报错？

A: 检查 `DEEPSEEK_API_KEY` 是否正确，余额是否充足。DeepSeek API 有时会有延迟，属于正常现象。

### Q6: 如何绑定自定义域名？

- **Vercel**：项目设置 → Domains → 添加你的域名，按提示配置 DNS
- **Render**：服务设置 → Custom Domains → 添加你的域名

### Q7: 如何更新代码？

```bash
# 修改代码后
git add .
git commit -m "更新内容描述"
git push
```

Vercel 和 Render 会自动检测到 main 分支更新，自动重新部署。

---

## 8. 成本估算（免费版）

| 服务 | 免费额度 | 超出后费用 |
|------|----------|-----------|
| Vercel | 100GB 带宽/月，无限部署 | $20/月起 |
| Render | 750 小时/月（刚好一个实例 24/7），100GB 带宽 | $7/月起（Starter） |
| DeepSeek | 按量付费，充值使用 | 约 ¥0.01/次面试 |
| GitHub | 无限公开仓库 | - |

**每月总成本：约 ¥0-10**（主要是 DeepSeek API 费用）

---

## 9. 升级建议（如果用户多了）

1. **后端升级**：Render Starter 实例（$7/月），不会休眠，性能更好
2. **数据库升级**：改用 PostgreSQL（Render 托管，$7/月起），并发性能更好
3. **CDN 加速**：前端用 Cloudflare CDN，国内访问更快
4. **对象存储**：简历文件用 S3/OSS 存储，不占本地磁盘

---

> **部署完成后，把前端地址 `https://你的前端名.vercel.app` 放到简历上，面试官点开就能直接体验！**
