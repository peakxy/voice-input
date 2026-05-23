# Voice Input Frontend

React 18 + Vite + TypeScript SPA for the Voice Input demo. Talks to the Spring Boot backend at `voice-input-backend`.

## 开发

需要 Node 18+。在 `voice-input-frontend/` 目录执行：

```bash
pnpm install   # 或 npm install
pnpm dev       # 启动 vite dev server，监听 5173 端口
```

后端默认运行在 `http://localhost:8080`，与 `SecurityConfig` 里允许的 CORS 来源 `http://localhost:5173` 匹配。

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 后端 REST + WebSocket 的基地址 | `http://localhost:8080` |

`.env.development` 和 `.env.example` 已经包含默认值。WebSocket 会自动在该地址上把 `http` 替换为 `ws`，并附加 `/ws/transcript?token=<jwt>`。

## 主要功能

- 注册 / 登录：`POST /api/auth/register`、`POST /api/auth/login`，JWT 持久化在 `localStorage`。
- 录音工作台：通过 `getUserMedia` + AudioWorklet 把麦克风采样降采样到 16 kHz / 16-bit PCM，按 ~50ms 分片走 WebSocket 传给后端。
- 实时显示：`partial` 单独显示在虚线行，`final` 追加，`polished` 用计数器与对应 final 配对替换。
- 热词管理：分组的 CRUD，激活分组保存在 `localStorage`，开始录音时作为 `start.hotwordGroup` 传入。
- 历史：`GET /api/transcripts` 倒序展示，每条可切换原文 / 润色稿并复制。

## 已知限制

- 单实例 demo：JWT 存放在 `localStorage`，对 XSS 不具防御性，正式部署时建议改为 HttpOnly Cookie。
- 仅在桌面 Chrome / Edge 上验证；其他浏览器对 AudioWorklet、`AudioContext.sampleRate` 行为不一定一致。
- `polished` 与 `final` 的对应关系基于到达顺序的计数器，因为后端 `WebSocketServerMessage` 当前不携带句子 id。
- 浏览器 `getUserMedia` 必须在 `localhost` 或 HTTPS 下才能拿到麦克风权限。

## 脚本

```bash
pnpm dev          # 开发模式
pnpm typecheck    # tsc --noEmit
pnpm build        # 类型检查 + vite build
pnpm preview      # 预览生产构建
pnpm lint         # ESLint
pnpm format       # Prettier
```
