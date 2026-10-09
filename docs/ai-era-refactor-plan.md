# ChatTransfer AI 时代重构计划

> 本计划是长期开源前的重构执行方案。当前开源目标仓库确认为 `turboxing/ChatTransfer`，源码与 Release 均托管在该仓库。

## 1. 目标与原则

### 目标

- 开源一个适合个人、团队与 AI 协作的局域网聊天传输工具。
- 建立清晰的分层架构与模块边界，降低多人维护成本。
- 移除硬编码密钥；埋点默认关闭，只有使用者显式配置自己的 key 时才启用。
- 统一仓库、发布、文档、版本数据源，消除多仓同步。
- 删除历史遗留和不可维护代码，补齐自动化、测试与贡献工作流。

### 原则

1. **AI 可读优先**：小文件、清晰命名、显式依赖、领域化目录，避免巨型单文件组件。
2. **边界优先**：服务端按 routes / services / repositories / utils 分层，前端按 components / composables / stores / api 分层。
3. **配置即契约**：所有环境差异通过环境变量和示例配置表达，禁止硬编码身份信息。
4. **可持续开源**：CI、测试、类型检查、Issue/PR 模板、贡献指南与发布流程是重构的一部分。
5. **渐进重构**：先建立安全网和接口测试，再拆分模块；每阶段都可构建、运行和发布。

## 2. 当前问题

| 领域 | 现状 | 风险 |
| --- | --- | --- |
| 架构 | `ChatLayout.vue` 超过 2200 行，状态、UI、通信、上传、Pin、设置耦合 | AI 和人改动范围大，容易回归 |
| 服务端 | `app.js` 混合入口、中间件、上传、版本、统计和启动逻辑 | 难测试，职责不清 |
| Socket | 用户状态依赖全局对象，事件逻辑集中 | 不利于横向扩展和单元测试 |
| 埋点 | Amplitude key 硬编码，设备指纹默认上报 | 泄露密钥，不适合开源 |
| 发布 | 源码与发布在过渡期分离，文档手动同步 | 链接与元数据易漂移 |
| 数据源 | changelog 分散在 JS、Markdown、JSON | 版本与文案不一致 |
| 质量 | 没有自动化测试、lint、typecheck、CI | 重构缺乏安全网 |
| 冗余 | 旧 `client/`、`tempdirs/`、未引用样式、旧版 socket client、示例/残留配置 | 增加上下文噪音 |

## 3. 仓库维护现状与开源策略

### 现状

| 仓库 | 地址 | 用途 | 状态 |
| --- | --- | --- | --- |
| 过渡期源码仓 | 私有仓库 | 当前源码、开发分支与历史提交 | 开发 origin，属于过渡期私有仓库 |
| `ChatTransfer` | GitHub 公开仓库 | 当前软件包发布、Releases、Issues | 已有用户可见发布历史 |

`ChatTransfer` GitHub 仓库已承担发布职责，后续作为唯一公开上游。过渡期私有源码仓在开源切换后不再作为活跃仓库维护。

### 推荐策略

1. **GitHub 仓库作为唯一上游**：`turboxing/ChatTransfer` 同时承载源码、Issues、Discussions、Actions 和 Releases。
2. **历史发布保留**：当前 GitHub 仓库中的 Releases、Tag、下载链接和用户可见资产应保留，迁移时用 Git 历史重建源码主线，而不是删除仓库重建。
3. **推荐迁移方式**：在本地整理出干净的开源主线后，推送到 `ChatTransfer` 的 `main` 或专门的 `opensource` 分支，完成 CI 与发布验证后再合并为默认分支。
4. **过渡期源码仓处置**：开源切换后不作为活跃仓库维护，也不在任何公开文档中链接或提及该私有仓库地址。
5. **历史清洗前置**：公开推送前必须清理敏感文件和硬编码 key；如无法安全清洗当前历史，则生成新的干净开源历史，而不是直接推送全部历史。
6. **分支策略**：日常开发使用 `main` + 短生命周期 feature 分支；当前 `forOpensource` 可作为重构集成分支，最终合并到 GitHub `main`。

### 开源切换流程

1. 在私有源码仓完成 Phase 0-5 重构与安全清洗。
2. 生成干净源码树，确认无私有仓库地址、私有仓库路径、个人缓存、发布产物和已知密钥。
3. 将干净树推送到 `turboxing/ChatTransfer` 的 `opensource` 分支。
4. 在 GitHub Actions 上完成 lint、test、build 和 Release 验证。
5. 将 `opensource` 分支合入 `main`，将其设为默认分支。
6. 更新仓库描述、主页、Issue 模板、License、Security Policy 和 Release metadata。
7. 过渡期私有源码仓归档或保持私有备份，但公开文档不再引用它。

> 推荐不需要继续维护过渡期私有源码仓。若需要备份，可在自动镜像配置稳定后作为只读镜像，但镜像仓库同样不得出现在开源文档中。

## 4. 埋点与隐私策略

### 目标行为

- 默认完全关闭埋点，不发起外网请求。
- 开源仓库中删除当前 Amplitude key，不在代码、配置示例、文档或 Git 历史中保留。
- 只有满足以下任一条件时启用：
  - 环境变量：`CHATTRANSFER_ANALYTICS_ENABLED=true`
  - 环境变量：`CHATTRANSFER_ANALYTICS_API_KEY=<user key>`
  - 本地配置文件：`config/local.json`
- key 与开关必须成对生效：无 key 时即使开关为 true 也保持关闭。
- 默认不采集硬件指纹、主机名、系统用户名等可识别信息。
- 事件只允许匿名聚合字段，例如版本、平台、事件类型、消息类型。
- README 与设置页明确说明埋点默认关闭。

### 设计

```text
config/default.json            # 开源默认值，analytics.enabled=false
config/local.example.json      # 示例，只含占位符
server/config/loader.js        # default + local + env 合并
server/telemetry/provider.js   # Provider 接口
server/telemetry/noop-provider.js
server/telemetry/http-provider.js
server/telemetry/index.js      # 根据 provider/noop 返回实例
```

`local.json` 示例：

```json
{
  "analytics": {
    "enabled": true,
    "provider": "amplitude",
    "apiKey": "YOUR_OWN_API_KEY",
    "endpoint": "https://api2.amplitude.com/2/httpapi"
  }
}
```

启用条件伪代码：

```js
const enabled = analytics.enabled && Boolean(analytics.apiKey);
```

## 5. 目标架构

### 后端

```text
server/
├── index.js
├── app.js
├── config/
│   ├── schema.js
│   ├── loader.js
│   └── defaults.js
├── http/
│   ├── middlewares/
│   │   ├── static.js
│   │   ├── upload.js
│   │   └── errors.js
│   └── routes/
│       ├── index.js
│       ├── files.js
│       ├── qr.js
│       ├── session.js
│       ├── system.js
│       └── telemetry.js
├── socket/
│   ├── index.js
│   ├── room-manager.js
│   └── handlers/
│       ├── connection.js
│       ├── users.js
│       ├── messages.js
│       └── errors.js
├── services/
│   ├── room-service.js
│   ├── message-service.js
│   ├── file-service.js
│   ├── qr-service.js
│   └── version-service.js
├── telemetry/
│   ├── index.js
│   ├── provider.js
│   ├── noop-provider.js
│   └── amplitude-provider.js
└── utils/
    ├── network.js
    ├── filesystem.js
    ├── id.js
    └── logger.js
```

设计要点：

- `index.js` 只负责装配和启动。
- HTTP 路由不写业务实现，调用 service。
- Socket handler 只做协议转换，业务逻辑进入 service。
- 会话/房间状态使用独立 `RoomManager`，以 `Map` 表达；先保留单机语义，后续可替换为 Redis adapter。
- 所有路径统一通过 `path.resolve` + 根目录前缀校验，禁止路径穿越。
- 错误统一返回 `{ code, message }`，日志统一走 logger。

### 前端

```text
frontend/src/
├── main.js
├── App.vue
├── api/
│   ├── client.js
│   ├── files.js
│   ├── system.js
│   └── telemetry.js
├── stores/
│   ├── session.js
│   ├── chat.js
│   ├── users.js
│   ├── uploads.js
│   └── ui.js
├── composables/
│   ├── use-socket.js
│   ├── use-messages.js
│   ├── use-uploads.js
│   ├── use-local-storage.js
│   └── use-clipboard.js
├── components/
│   ├── chat/
│   │   ├── ChatContainer.vue
│   │   ├── ChatHeader.vue
│   │   ├── MessageList.vue
│   │   ├── MessageItem.vue
│   │   ├── MessageComposer.vue
│   │   ├── UploadArea.vue
│   │   ├── PinBar.vue
│   │   └── PinDrawer.vue
│   └── settings/
│       ├── SettingsDrawer.vue
│       ├── LanguageSection.vue
│       ├── CacheSection.vue
│       └── AboutSection.vue
├── views/
│   ├── HomeView.vue
│   ├── LoginView.vue
│   └── ChatView.vue
└── types/
    ├── message.js
    ├── user.js
    └── socket-events.js
```

设计要点：

- `ChatContainer.vue` 控制装配，不处理业务细节。
- Socket 事件、消息状态、上传状态分别进入独立 store。
- 所有接口集中到 `api/`，组件不直接调用 `fetch/XHR`。
- Socket 事件名和 payload 定义集中到 `types/socket-events.js`。
- 逐步使用 JSDoc 标注公共接口；如后续规模增长，可引入 TypeScript 迁移策略。

## 6. AI 协作工程化

### 仓库指南

新增或整理：

```text
AGENTS.md
CLAUDE.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
ARCHITECTURE.md
docs/
├── development.md
├── testing.md
├── release.md
└── telemetry.md
.github/
├── ISSUE_TEMPLATE/
├── PULL_REQUEST_TEMPLATE.md
└── workflows/
```

内容要求：

- `AGENTS.md` 说明目录边界、命名规则、禁止事项、必须运行的命令。
- `ARCHITECTURE.md` 提供模块图、数据流、Socket 协议和关键决策记录。
- `CONTRIBUTING.md` 要求 PR 描述包含问题、方案、截图和测试结果。
- PR 模板要求 AI 辅助改动说明来源、验证方式和影响面。

### 开发体验

- 后端：Node.js ESM 或明确 CommonJS 策略，统一日志、错误对象和配置加载。
- 前端：Vite + Vue 3 Composition API + Pinia。
- 测试：Vitest 覆盖 service、composable、Socket 协议转换。
- 静态检查：ESLint、Prettier、`npm audit` 或等效安全审计。
- Mock：Supertest 覆盖 HTTP，`socket.io-client` 覆盖实时通信，Playwright 覆盖关键路径。

### CI/CD

```text
.github/workflows/ci.yml
├── install
├── lint
├── test
├── frontend build
└── backend smoke test

.github/workflows/release.yml
├── tag 触发
├── 版本一致性检查
├── changelog 生成
├── 构建前端
├── pkg 打包 macOS / Windows
├── SHA256 清单
└── 创建 GitHub Release 并上传 Assets
```

发布目标仓库统一为 `turboxing/ChatTransfer`，不再使用单独 Release 仓库同步。

## 7. 数据与发布统一

- 仓库：`turboxing/ChatTransfer`。
- 版本号唯一来源：`package.json`。
- Changelog 唯一来源：`docs/release/changelog.json`，包含 `version/date/zh-CN/en/ar`。
- 构建时生成：
  - `frontend/src/generated/changelog.json`
  - `CHANGELOG.md`
  - `CHANGELOG.en.md`
  - `CHANGELOG.ar.md`
  - `release/releases.json`
- Release metadata 包含 tag、version、date、asset 名称、大小、SHA256、下载 URL。
- 仓库内不再维护 `release/README.*` 三份独立首页；生成或链接主 README。

### 立即删除

| 路径 | 原因 |
| --- | --- |
| `client/` | 空壳/历史目录 |
| `tempdirs/` | 本地测试残留 |
| `frontend/src/style.css` | 未被引用 |
| `server/users.json` | 运行态/历史残留，如确认未使用则删除 |
| `a.json` | 含敏感信息，开源前必须从工作区和 Git 历史清除 |
| root `socket.io-client` 依赖 | 后端不使用，前端已使用 v4 |

### 重构后清理

| 项目 | 处理 |
| --- | --- |
| 根目录历史规划文档 | 保留必要文档，合并入 `docs/` 或删除 |
| `release/` 手工文档 | 改为生成产物 |
| `GITHUB_RELEASE_PLAN.md` | 并入 `docs/release.md` |
| `server/analytics.js` | 拆分为 telemetry provider |
| 硬编码 Amplitude key | 删除并清理 Git 历史 |

- 移除并从 Git 历史清除已泄露的 API key。
- 上传接口限制文件数量、单文件大小、允许扩展名和缓存目录配额。
- 文件名规范化，避免路径穿越和特殊字符。
- 默认绑定 `0.0.0.0`，但增加可选 `CHATTRANSFER_ALLOWED_ORIGIN` / CIDR 限制。
- Socket.IO 默认允许局域网 origin；开源版本提供安全说明与配置。
- 默认埋点关闭，敏感字段禁止上报。
- 提供 Docker 非 root 用户运行示例。

## 8. 安全基线

### Phase 0：安全与仓库冻结（0.5 天）

1. 确认当前工作区和 Git 历史中的敏感 key。
2. 删除硬编码 Amplitude key，埋点改为显式配置。
3. 确认 `a.json` 从工作区和历史中清除。
4. 备份当前发布产物与 tag。

验收：仓库检索不到已知 key；默认启动不发出埋点请求。

### Phase 1：安全网（1-2 天）

1. 建立 ESLint、Prettier、Vitest、Supertest 基础。
2. 为文件上传、配置加载、版本、Socket 消息 payload 写回归测试。
3. 补充冒烟测试：启动服务、访问首页、连接 Socket、发送文本、上传小文件。

验收：本地一键执行 lint/test/build；关键行为有回归保障。

### Phase 2：配置与埋点重构（1 天）

1. 引入 `config/default.json`、`config/local.example.json`、env loader 和配置 schema。
2. 新建 telemetry provider 抽象。
3. 默认使用 noop provider。
4. 设置页展示隐私说明。

验收：无 key 时无请求；用户填入自己的 key 后可启用。

### Phase 3：服务端重构（3-5 天）

1. 拆分 HTTP routes、services、utils。
2. 建立 `RoomManager`，移除 `global.users/global.groupName`。
3. 统一错误处理、日志、文件路径安全与响应结构。
4. 保持 Socket 事件向后兼容，或一次性升级到 `v2` 事件协议。

验收：所有功能等价；新增单测通过；无全局业务状态。

### Phase 4：前端重构（5-8 天）

1. 抽离 API 层与 store。
2. 拆分 `ChatLayout.vue` 为 header、message list、message item、composer、upload、pin、settings。
3. 抽离 socket、messages、uploads、storage composables。
4. 保留视觉与交互不变，先重构后优化 UI。

验收：单文件组件尽量低于 300 行；聊天收发、上传、Pin、设置功能无回归。

### Phase 5：开源工程化（2-3 天）

1. 更新 `AGENTS.md`、`ARCHITECTURE.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`。
2. 添加 Issue/PR 模板。
3. 配置 CI。
4. 精简 README，链接开发者文档。

验收：新协作者或 AI 只读仓库指南即可完成环境搭建、修改和验证。

### Phase 6：发布系统（2-3 天）

1. 统一 changelog JSON 与生成器。
2. 更新 GitHub workflow。
3. 统一仓库链接和 Release 资产命名。
4. 添加 SHA256 校验清单。
5. 打一个重构后的预发布版本，验证下载、安装说明和运行。

验收：tag 触发后自动产出三语文档、Release metadata、macOS/Windows assets 和校验文件。

### Phase 7：开源切换与社区化（持续）

1. 将开发仓库指向 GitHub `turboxing/ChatTransfer`。
2. 保留 Issues/Releases，开启 Discussions。
3. 添加 good first issue、roadmap、security policy。
4. 建立版本节奏与维护者响应流程。

验收：外部用户可下载运行、阅读文档、提交 Issue/PR，无需访问私有仓库。

## 9. 阶段计划

| 里程碑 | 内容 | 预计周期 | 核心验收 |
| --- | --- | --- | --- |
| M0 安全冻结 | 埋点 key、敏感文件清理 | 0.5 天 | 已知 key 不存在于工作区与 Git 历史 |
| M1 安全网 | lint/test/smoke | 1-2 天 | 一键验证 |
| M2 配置重构 | 显式埋点配置 | 1 天 | 无 key 不请求 |
| M3 后端重构 | 分层架构 | 3-5 天 | 功能等价且可测 |
| M4 前端重构 | 组件/store/composable 拆分 | 5-8 天 | 巨型组件消除 |
| M5 开源工程化 | AI 协作与社区文件 | 2-3 天 | 协作路径清晰 |
| M6 发布系统 | 自动 Release | 2-3 天 | tag 触发完整发布 |
| M7 正式开源 | GitHub 切换 | 0.5 天 | 仓库与发布统一 |

总计约 15-23 个工作日，可按里程碑拆成多个 PR 分阶段合入。

## 10. 里程碑与验收

1. Phase 0 安全冻结。
2. Phase 1 测试与 CI 基础。
3. Phase 2 配置与 telemetry。
4. Phase 3 服务端重构。
5. Phase 4 前端重构。
6. Phase 5 开源工程化。
7. Phase 6 发布系统。
8. Phase 7 切换 GitHub 开源。

每个 Phase 使用独立分支和 PR；禁止把敏感清理、大重构和新功能混合在同一个变更中。

## 11. 执行顺序

1. Phase 0 安全冻结。
2. Phase 1 测试与 CI 基础。
3. Phase 2 配置与 telemetry。
4. Phase 3 服务端重构。
5. Phase 4 前端重构。
6. Phase 5 开源工程化。
7. Phase 6 发布系统。
8. Phase 7 切换 GitHub 开源。

每个 Phase 使用独立分支和 PR；禁止把敏感清理、大重构和新功能混合在同一个变更中。

## 12. 不做的事项

- 不在开源版本保留作者私有 Amplitude key。
- 不将用户填写的 key、本地上传文件或聊天内容提交到仓库。
- 不为了重构一次性重写业务，导致长期无法发布。
- 不在本次重构中优先做 Linux 打包、移动端原生包装或大规模视觉改版；待架构稳定后按 roadmap 推进。
