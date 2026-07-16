# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 技术栈

- Java 17，Maven，Spring Boot 3.5.9
- Spring AI 1.1.4，对接 DeepSeek 与 Anthropic Codex
- 前端为静态资源：`index.html` + 原生 JavaScript（Tailwind CSS CDN），另有 `vue-app.html`（Vue 3 CDN，无构建工具）
- 当前没有数据库、缓存、前端打包器或独立 lint 工具配置

## 常用命令

优先使用 Maven Wrapper，避免依赖本机 Maven 版本差异。

```bash
# 编译
./mvnw clean compile -DskipTests

# 运行全部测试
./mvnw test

# 运行单个测试类
./mvnw -Dtest=LikeAiProgrammingApplicationTests test

# 运行单个测试方法
./mvnw -Dtest=LikeAiProgrammingApplicationTests#contextLoads test

# 打包
./mvnw clean package -DskipTests

# 启动应用（Git Bash / macOS / Linux）
DEEPSEEK_API_KEY=your-key-here ANTHROPIC_API_KEY=your-key-here ./mvnw spring-boot:run

# Windows cmd 启动示例
set DEEPSEEK_API_KEY=your-key-here
set ANTHROPIC_API_KEY=your-key-here
mvnw.cmd spring-boot:run
```

启动后访问：`http://localhost:8080`。

如只需要做静态页面或文档改动，通常无需运行后端；改动 Java 代码后至少运行 `./mvnw test` 或相应单测。

## 高层架构

这是一个单模块 Spring Boot Web 应用，后端提供 AI 对话 API，前端通过静态页面直接调用同源接口。

### 后端分层

- `api`：HTTP 层。
  - `AiController` 暴露 `/api/ai` 下的对话接口。
  - `ChatRequest` 是请求 DTO，字段为 `message` 和 `model`。
- `app`：应用服务层。
  - `AiChatService` 定义普通对话与流式对话能力。
  - `AiChatServiceImpl` 根据 `model` 在 DeepSeek 与 Codex 的 `ChatClient` 之间选择。
- `infra`：基础设施配置。
  - `AiConfiguration` 创建两个命名 `ChatClient` Bean：`deepseek` 与 `Codex`。
  - `WebConfig` 注册 UTF-8 编码过滤器。

### API 形态

- `POST /api/ai/chat`
  - 请求体：`{"message":"...","model":"deepseek|Codex"}`
  - 返回：`Map<String,Object>`，成功时主要包含 `success: true` 与 `content`。
- `GET /api/ai/chat/stream?message=...&model=deepseek|Codex`
  - 返回 `text/event-stream`。
  - 普通内容使用 `event: message`，结束时发送 `event: done`。

后端模型选择值应保持为 `deepseek` 或 `Codex`；新增模型时需要同时更新后端 `AiChatServiceImpl` 的选择逻辑和前端模型选项。

### AI 配置

`application.yml` 通过环境变量读取 API Key：

- `DEEPSEEK_API_KEY`
- `ANTHROPIC_API_KEY`

DeepSeek 默认模型配置为 `deepseek-chat`。Anthropic 默认模型配置写在 `application.yml` 中，但 `AiConfiguration` 目前直接构建 `AnthropicChatModel`，如调整模型、温度或 max tokens，应确认 Spring AI 配置是否实际被对应 builder 读取。

### 前端结构

- `src/main/resources/static/index.html` 是主页面。
  - 负责页面结构和 Tailwind CDN 样式。
  - 仍存在少量内联 `onclick` 示例按钮；主要聊天交互在 `js/app.js` 中。
- `src/main/resources/static/js/app.js` 是主页面核心逻辑。
  - 使用全局 `APP_CONFIG`、`APP_STATE` 与 `DOM_ELEMENTS`。
  - 普通发送调用 `POST /api/ai/chat`。
  - 流式发送使用 `EventSource` 调用 `GET /api/ai/chat/stream`，包含最多 3 次重试、30 秒超时与 ESC 停止流式响应。
- `src/main/resources/static/vue-app.html` 是 Vue 3 CDN 版本。
  - 与主页面相互独立，无构建步骤。
  - 修改时注意与后端响应结构保持一致：当前后端成功内容在 `content` 字段。

## 编码约定

- 对话、解释、文档和 Commit message 使用简体中文；技术名词可保留英文。
- 代码注释使用中文，Spring AI、ChatClient、SSE、EventSource 等技术名词可保留英文。
- 包结构保持 `api`（Controller/DTO）→ `app`（Service）→ `infra`（配置）的分层。
- 新业务逻辑放在 Service 层，Controller 只做 HTTP 入参出参与协议适配。
- 优先使用构造器注入；维护旧代码时可逐步替换字段注入。
- Commit message 风格沿用：`[ADD] 新增xxx`、`[FIX] 修复xxx`。
