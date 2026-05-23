# Voice Input - 智能语音输入法

<div align="center">

![Java](https://img.shields.io/badge/Java-17-orange?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.6-brightgreen?style=flat-square)
![React](https://img.shields.io/badge/React-18.3.1-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

一款基于实时语音识别的智能输入法，支持网页版和 Chrome 插件，提供流畅的语音转文字体验。

[功能特性](#功能特性) • [快速开始](#快速开始) • [使用指南](#使用指南) • [架构设计](#架构设计) • [开发指南](#开发指南)

</div>

---

## 📖 项目简介

Voice Input 是一款现代化的语音输入解决方案，通过实时语音识别技术将语音转换为文字。项目采用前后端分离架构，支持网页版和 Chrome 插件两种使用方式，其中 Chrome 插件可在任意网页的输入框中使用，实用性更强。

### 为什么选择 Voice Input？

- 🚀 **实时转写** - 基于 WebSocket 的实时语音识别，低延迟高准确率
- 🎯 **智能润色** - 集成 LLM 自动补全标点、去除口语填充词
- 📝 **热词管理** - 支持自定义热词分组，提升专业领域识别准确率
- 🔌 **Chrome 插件** - 全局快捷键激活，支持任意输入框
- 📊 **转写历史** - 完整记录转写内容，支持原文/润色稿切换
- 🎨 **现代化 UI** - 基于 React + Tailwind CSS，响应式设计

---

## ✨ 功能特性

### 核心功能

- **实时语音转写**
  - 支持实时语音识别，三阶段输出（临时 → 确定 → 润色）
  - 基于阿里云 DashScope ASR 引擎
  - 自动降采样至 16kHz 单声道 PCM

- **智能文本润色**
  - LLM 驱动的文本后处理
  - 自动补全标点符号（。？！等）
  - 去除口语填充词（"嗯"、"啊"等）

- **热词管理**
  - 支持创建多个热词分组（通用、工作、生活等）
  - 从热词种子库快速导入
  - 自动爬取微博、百度、知乎热搜

- **语音命令**
  - 支持特殊词汇控制（"新段落"、"换行"、"删除上一句"）
  - 标点符号语音输入（"句号"、"问号"等）

- **转写历史**
  - 完整保存转写记录（原文 + 润色稿 + 时长）
  - 支持切换显示模式
  - 一键复制功能

### Chrome 插件特性

- **全局快捷键** - `Ctrl+Shift+Y` (Win/Linux) / `Cmd+Shift+Y` (macOS)
- **侧边栏 UI** - 不遮挡网页内容
- **任意输入框** - 通过内容脚本注入文本
- **后台录音** - 离屏文档支持，UI 关闭时继续工作

---

## 🛠️ 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Java | 17 | 核心语言 |
| Spring Boot | 3.4.6 | 应用框架 |
| Spring AI | 1.0.0 | LLM 集成 |
| MyBatis | 3.0.4 | 数据持久化 |
| Spring WebSocket | - | 实时通信 |
| Spring Security + JWT | - | 身份认证 |
| Redis + Caffeine | - | 多级缓存 |
| DashScope SDK | 2.22.2 | 语音识别 |
| MySQL | 8.0+ | 数据存储 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3.1 | UI 框架 |
| TypeScript | 5.6.3 | 类型安全 |
| Vite | 5.4.8 | 构建工具 |
| React Router | 6.27.0 | 路由管理 |
| TanStack Query | 5.59.20 | 数据获取 |
| Zustand | 4.5.5 | 状态管理 |
| Tailwind CSS | 3.4.13 | 样式框架 |
| Axios | 1.7.7 | HTTP 客户端 |

---

## 🚀 快速开始

### 环境要求

- **后端**
  - Java 17+
  - Maven 3.6+
  - MySQL 8.0+
  - Redis 6.0+

- **前端**
  - Node.js 18+
  - npm 或 pnpm

### 1. 克隆项目

```bash
git clone https://github.com/your-username/voice-input.git
cd voice-input/voice-input-backend
```

### 2. 启动基础服务

使用 Docker Compose 快速启动 MySQL 和 Redis：

```bash
cd docs/dev-ops
docker-compose -f docker-compose-environment.yml up -d
```

### 3. 配置后端

编辑 `src/main/resources/application.yml`：

```yaml
# 数据库配置
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/voice_input
    username: root
    password: your_password

# Redis 配置
  data:
    redis:
      host: localhost
      port: 6379

# DashScope ASR 配置
dashscope:
  api-key: your_dashscope_api_key

# OpenAI LLM 配置（用于文本润色）
spring:
  ai:
    openai:
      api-key: your_openai_api_key
      base-url: https://api.openai.com  # 可选：自定义代理
```

初始化数据库：

```bash
mysql -u root -p < docs/dev-ops/mysql/sql/init.sql
```

### 4. 启动后端

```bash
mvn clean install
mvn spring-boot:run
```

后端将在 `http://localhost:8080` 启动。

### 5. 配置前端

编辑 `frontend/.env`：

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080
```

### 6. 启动前端

#### 网页版

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`

#### Chrome 插件

```bash
cd frontend
npm run build:extension
```

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `frontend/dist-extension` 目录

---

## 📱 使用指南

### 网页版使用

1. **注册/登录**
   - 访问 `http://localhost:5173`
   - 注册新账号或使用现有账号登录

2. **管理热词**
   - 进入"热词管理"页面
   - 创建热词分组（如"工作"、"生活"）
   - 添加自定义热词或从种子库导入

3. **开始录音**
   - 进入"录音工作台"
   - 选择热词分组
   - 点击"开始录音"按钮
   - 授权麦克风权限
   - 开始说话，实时查看转写结果

4. **查看历史**
   - 进入"转写历史"页面
   - 查看所有转写记录
   - 切换原文/润色稿显示
   - 一键复制文本

### Chrome 插件使用

1. **激活插件**
   - 方式一：点击浏览器工具栏的插件图标
   - 方式二：使用快捷键 `Ctrl+Shift+Y` (Win/Linux) 或 `Cmd+Shift+Y` (macOS)

2. **侧边栏录音**
   - 插件会在页面右侧打开侧边栏
   - 登录账号（与网页版共享）
   - 选择热词分组
   - 点击"开始录音"

3. **插入文本**
   - 录音完成后，转写结果会自动显示
   - 点击"插入"按钮，文本会插入到当前聚焦的输入框

4. **全局使用**
   - 在任意网页的输入框中使用
   - 支持 Gmail、Notion、Google Docs 等

---

## 🏗️ 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
│  ┌──────────────┐              ┌──────────────┐             │
│  │   网页版      │              │ Chrome 插件   │             │
│  │  (React SPA) │              │  (Manifest v3)│             │
│  └──────┬───────┘              └──────┬────────┘             │
└─────────┼──────────────────────────────┼───────────────────┘
          │                              │
          │  HTTP/WebSocket              │
          │                              │
┌─────────┼──────────────────────────────┼───────────────────┐
│         ▼                              ▼                    │
│  ┌──────────────────────────────────────────────┐          │
│  │          Spring Boot 应用层                   │          │
│  │  ┌────────────┐  ┌────────────┐  ┌────────┐ │          │
│  │  │ REST API   │  │ WebSocket  │  │ 事件总线│ │          │
│  │  └────────────┘  └────────────┘  └────────┘ │          │
│  │  ┌────────────┐  ┌────────────┐  ┌────────┐ │          │
│  │  │ 业务服务层  │  │ 缓存管理   │  │ 定时任务│ │          │
│  │  └────────────┘  └────────────┘  └────────┘ │          │
│  └──────────────────────────────────────────────┘          │
└─────────┬──────────────────────────────┬───────────────────┘
          │                              │
          │                              │
┌─────────┼──────────────────────────────┼───────────────────┐
│         ▼                              ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    MySQL     │  │    Redis     │  │  Caffeine    │     │
│  │  (持久化)     │  │  (L2 缓存)   │  │  (L1 缓存)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
          │                              │
          │  外部服务                     │
          │                              │
┌─────────┼──────────────────────────────┼───────────────────┐
│         ▼                              ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  DashScope   │  │   OpenAI     │  │  热搜爬虫     │     │
│  │  (ASR 引擎)  │  │  (文本润色)  │  │ (微博/百度等) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
```

### 核心设计

#### 1. 多级缓存系统

```
请求 → L1 (Caffeine) → L2 (Redis) → DB (MySQL)
         ↓ 命中           ↓ 命中        ↓ 回源
       返回            返回           返回 + 回填
```

- **L1 缓存**：进程内 Caffeine，快速访问
- **L2 缓存**：分布式 Redis，跨实例共享
- **降级策略**：Redis 故障时自动回退到 MyBatis

#### 2. WebSocket 实时转写流程

```
客户端                    服务端                    DashScope
  │                        │                          │
  ├─ start ───────────────>│                          │
  │                        ├─ 建立 ASR 连接 ─────────>│
  │                        │<─ ready ─────────────────┤
  │<─ ready ───────────────┤                          │
  │                        │                          │
  ├─ PCM 帧 ──────────────>│                          │
  │                        ├─ 转发音频帧 ────────────>│
  │                        │<─ partial 结果 ──────────┤
  │<─ partial ─────────────┤                          │
  │                        │<─ final 结果 ────────────┤
  │<─ final ───────────────┤                          │
  │                        ├─ LLM 润色 ──────────────>│
  │<─ polished ────────────┤                          │
  │                        │                          │
  ├─ stop ────────────────>│                          │
  │                        ├─ 关闭 ASR 连接 ─────────>│
  │<─ closed ──────────────┤                          │
```

#### 3. 事件驱动架构

- **UserAuthenticatedEvent** → 自动导入热词种子
- **SentenceFinalizedEvent** → 异步润色 + 持久化
- **TranscriptPersistEvent** → 保存到数据库
- **ProviderHealthEvent** → 监控外部服务健康

#### 4. Chrome 插件架构

```
┌─────────────────────────────────────────────────────┐
│                    Chrome 插件                       │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  Popup   │    │ SidePanel│    │  Content │     │
│  │   UI     │    │    UI    │    │  Script  │     │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘     │
│       │               │               │            │
│       └───────────────┼───────────────┘            │
│                       │                            │
│                  ┌────▼─────┐                      │
│                  │Background│                      │
│                  │  Service │                      │
│                  └────┬─────┘                      │
│                       │                            │
│                  ┌────▼─────┐                      │
│                  │Offscreen │                      │
│                  │ Document │                      │
│                  │(麦克风录音)│                      │
│                  └──────────┘                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 开发指南

### 项目结构

```
voice-input-backend/
├── src/main/java/cn/peakxy/input/
│   ├── controller/          # REST API 端点
│   ├── service/             # 业务逻辑层
│   ├── websocket/           # WebSocket 处理
│   ├── domain/              # 数据模型
│   ├── mapper/              # MyBatis 映射
│   ├── config/              # 配置类
│   ├── cache/               # 多级缓存
│   ├── crawler/             # 热词爬虫
│   ├── client/              # 外部服务客户端
│   ├── event/               # 事件监听器
│   └── security/            # JWT 认证
├── src/main/resources/
│   ├── application.yml      # 主配置文件
│   └── mapper/              # MyBatis XML
├── frontend/
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # UI 组件库
│   │   ├── stores/          # Zustand 状态
│   │   ├── lib/             # 工具函数
│   │   └── extension/       # Chrome 插件
│   ├── public/              # 静态资源
│   └── dist-extension/      # 插件构建产物
└── docs/                    # 文档
    ├── backend-mvp.md       # 后端 MVP 文档
    ├── websocket-heartbeat.md  # 心跳协议
    └── dev-ops/             # 部署配置
```

### 本地开发

#### 后端开发

```bash
# 启动开发模式（热重载）
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 运行测试
mvn test

# 代码格式化
mvn spotless:apply
```

#### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 构建生产版本
npm run build

# 构建 Chrome 插件
npm run build:extension
```

### API 文档

#### REST API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/me` | GET | 获取当前用户 |
| `/api/hotwords` | GET | 获取热词列表 |
| `/api/hotwords` | POST | 创建热词 |
| `/api/hotwords/{id}` | DELETE | 删除热词 |
| `/api/hotword-seeds` | GET | 获取热词种子 |
| `/api/hotwords/import-seeds` | POST | 导入热词种子 |
| `/api/transcripts` | GET | 获取转写历史 |

#### WebSocket API

**端点**: `ws://localhost:8080/ws/transcript?token=<jwt>`

**客户端消息**:
```json
// 开始录音
{"type": "start", "hotwordGroup": "通用"}

// 发送音频帧（二进制 PCM）
<binary data>

// 停止录音
{"type": "stop"}

// 心跳响应
{"type": "pong"}
```

**服务端消息**:
```json
// 就绪
{"type": "ready"}

// 临时结果
{"type": "partial", "text": "你好"}

// 确定结果
{"type": "final", "text": "你好世界"}

// 润色结果
{"type": "polished", "text": "你好，世界。"}

// 心跳请求
{"type": "ping"}

// 错误
{"type": "error", "message": "错误信息"}

// 连接关闭
{"type": "closed"}
```

### 配置说明

#### 缓存配置

编辑 `application.yml`：

```yaml
cache:
  regions:
    hotwords:
      ttl: 3600        # 1小时
      max-size: 1000
    transcripts:
      ttl: 1800        # 30分钟
      max-size: 500
```

#### 热词爬虫配置

```yaml
hotword:
  crawler:
    enabled: true
    cron: "0 17 4 * * ?"  # 每天 4:17 UTC
    sources:
      - weibo
      - baidu
      - zhihu
```

#### WebSocket 心跳配置

```yaml
websocket:
  heartbeat:
    ping-interval: 20000    # 20秒
    pong-timeout: 10000     # 10秒
    idle-timeout: 120000    # 120秒
```

---

## 📦 部署

### Docker 部署（推荐）

```bash
# 构建后端镜像
docker build -t voice-input-backend .

# 启动完整服务栈
docker-compose up -d
```

### 手动部署

#### 后端部署

```bash
# 打包
mvn clean package -DskipTests

# 运行
java -jar target/voice-input-backend-1.0.0.jar \
  --spring.profiles.active=prod \
  --spring.datasource.url=jdbc:mysql://your-db-host:3306/voice_input \
  --spring.data.redis.host=your-redis-host
```

#### 前端部署

```bash
# 构建
cd frontend
npm run build

# 部署到 Nginx
cp -r dist/* /var/www/html/
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [DashScope](https://dashscope.aliyun.com/) - 提供语音识别服务
- [OpenAI](https://openai.com/) - 提供文本润色能力
- [Spring Boot](https://spring.io/projects/spring-boot) - 强大的后端框架
- [React](https://react.dev/) - 优秀的前端框架

---

## 📞 联系方式

- 作者: peakxy
- 邮箱: 2465549609@qq.com
- GitHub: [@peakxy](https://github.com/peakxy)

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star 支持一下！**

Made with ❤️ by peakxy

</div>
