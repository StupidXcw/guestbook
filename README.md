# AI 留言板 guestbook

一个渐进式学习项目：从零手写 Next.js App Router 全栈应用，并在其上集成 LLM 能力。

线上地址：见 Vercel 项目（StupidXcw/guestbook）

## 功能

- 留言 CRUD：发布、列表、详情页（服务端渲染 + 动态路由）
- AI 总结：基于真实留言生成情绪 / 主题 / 回复建议三要点
- 一句话添加：自然语言描述 → AI 解析成结构化留言 → 走原有落库逻辑
- 流式聊天：AI 助手侧栏，回复逐字输出
- 提交后列表自动更新（`router.refresh()`，无需手动刷新）

## 技术栈

Next.js 16（App Router / Turbopack）· React 19 · TypeScript 5 · Tailwind CSS 4 · 智谱 GLM-4-Flash（OpenAI 兼容接口，`fetch` 直调，无 SDK）

## 本地运行

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # 生产构建验证
```

`.env.local` 需要以下变量（线上需在 Vercel → Settings → Environment Variables 配置同名变量后 Redeploy）：

```bash
SITE_ANNOUNCE=...        # 首页公告
NEXT_PUBLIC_SITE_NAME=... # 站点名（打进前端包）
LLM_API_KEY=...          # 智谱 API Key（仅服务端，严禁 NEXT_PUBLIC 前缀）
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
LLM_MODEL=glm-4-flash
```

## API 一览

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/messages` | GET / POST | 留言列表 / 发布（POST 校验 name、content） |
| `/api/messages/[id]` | GET / PATCH / DELETE | 单条详情 / 修改 / 删除 |
| `/api/ai/chat` | POST | 单轮对话，返回 `{ reply }` |
| `/api/ai/summary` | GET | AI 总结最近 20 条留言，返回 `{ summary }` |
| `/api/ai/parse` | POST | 自然语言 → `{ name, content }`（AI 只翻译，不落库） |
| `/api/ai/stream` | POST | 流式对话，返回纯文本流（SSE 已在服务端剥离） |

验收示例：

```bash
curl -X POST localhost:3000/api/ai/chat -H "Content-Type: application/json" -d '{"message":"用一句话介绍你自己"}'
curl localhost:3000/api/ai/summary
curl -N -X POST localhost:3000/api/ai/stream -H "Content-Type: application/json" -d '{"message":"用三句话介绍 React"}'
```

## 架构要点

- **数据层**：`lib/data.ts`，`globalThis` 单例（页面与接口双 bundle 共享内存数据）
- **AI 公共层**：`lib/llm.ts`——环境变量统一校验（`requireLlmConfig()` 返回判别联合，`instanceof` 收窄），配置缺失统一 500
- **前端响应防御**：`lib/safeJson.ts`——先 `res.text()` 再 `JSON.parse`，空 body / 非 JSON 不再炸页面
- **分层原则**：AI 层只做「自然语言 → 结构化数据」的翻译，落库永远走原有 `/api/messages`；服务端组件（列表/详情）+ 客户端组件（表单/聊天）分工

---

## 变更说明 · 2026-11-26（阶段1 AI 应用层迭代）

### 新增

- **AI 对话接口**（E1）：`POST /api/ai/chat`，服务端 `fetch` 直调 GLM，API Key 只存服务端环境变量
- **AI 总结**（E2）：`GET /api/ai/summary`，将 `listMessages()` 数据以编号列表注入 prompt，`slice(0, 20)` 做上下文长度保护；首页新增「AI 总结」按钮（`components/AiSummary.tsx`）
- **一句话添加留言**（E3）：`POST /api/ai/parse`，三重保险保证结构化输出——system prompt 约束、伪造 assistant 历史（few-shot）打样、代码端剥 markdown 围栏 + `JSON.parse` 校验兜底；AI 解析结果经前端二跳请求走原有落库接口，AI 层与数据层解耦
- **流式聊天**（E4）：`POST /api/ai/stream` 服务端开启 `stream: true`，解析上游 SSE（`data: {...}` / `[DONE]`），经 `buffer` 缓冲与 `TextDecoder({ stream: true })` 处理多字节截断后转纯文本流；前端 `components/ChatPanel.tsx` 用 `getReader()` 循环逐块 `setState` 实现打字机效果
- **列表自动更新**：提交 / AI 添加成功后调用 `router.refresh()` 重跑服务端组件，替代手动刷新，客户端 state 保留

### 加固（E5 进行中）

- **`lib/safeJson.ts`**：前端所有 JSON 接口调用改走统一安全解析（修复点：接口 500 + 空 body 时 `res.json()` 抛异常导致按钮卡死——E2 上线事故的根治方案）
- **`lib/llm.ts`**：四个 AI 接口的环境变量检查从 `!` 非空断言升级为运行时显式校验 + 判别联合返回；`process.env` 非空断言全项目清零
- **AI 接口限流**：`lib/rateLimit.ts` 内存滑动窗口（同一 IP 一分钟 10 次，超出返回 429），四个 `/api/ai/*` 接口全部挂上，防 API Key 被刷爆
- **system prompt 统一打磨**：四处 prompt 统一人设（「AI 留言板」）、补充「不确定不要编造」约束；parse 接口增加「无留言内容时返回空对象」约定，配合字段校验输出更友好的 400 提示

### 待办

- ~~AI 接口限流~~（已完成）
- ~~system prompt 打磨~~（已完成）

### 已知限制

- 数据存内存（`globalThis`），Serverless 冷启动即清零——留言不持久，待阶段2 接数据库解决
- AI 功能依赖 `LLM_*` 环境变量，线上需在 Vercel 配置并 Redeploy
