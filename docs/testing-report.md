# ChatTransfer 测试报告

> 执行时间：2026-09-27  
> 版本：`2.0.9.1`  
> 分支：`forOpensource`

## 一、自动化测试结果

| 用例 | 目标 | 结果 |
|---|---|---|
| `tests/server.test.js` | 首页/静态路由、版本接口、登录目标 URL | 通过 |
| `tests/http-api.test.js` | 版本与扫码登录 URL、无文件上传拒绝、共享登录状态接口 | 通过 |
| `tests/message-service.test.js` | 群聊/私聊消息装饰、发送人昵称和 IP 快照 | 通过 |
| `tests/use-socket.test.js` | Socket 连接后注册 `login` / `group_online`、用户列表、群名、消息回调 | 通过 |
| `tests/use-messages.test.js` | 群聊/私聊历史过滤、消息保存去重 | 通过 |
| `tests/use-send-history.test.js` | 唯一记录、最多 10 条、上下键历史导航 | 通过 |
| `tests/analytics.test.js` | 无 key 或禁用时不启用埋点 provider | 通过 |
| `tests/gitignore.test.js` | 阻止本地配置和敏感文件进入仓库 | 通过 |
| `tests/version.test.js` | 版本格式和目标仓库地址 | 通过 |
| `tests/socket-e2e.test.js` | 三客户端群聊广播、私聊定向发送、离线过滤、在线人数同步、polling/websocket 混合协议 | 通过 |

## 二、构建验证

| 命令 | 结果 |
|---|---|
| `npm test` | 通过，10 个测试文件，21 个测试 |
| `cd frontend && npm run build` | 通过 |

## 三、构建警告

1. Vite Node API CJS deprecation warning。
2. `vconsole` 中存在 `eval`。
3. 前端主包 `index-2fIaa3eS.js` 约 `2.24 MB`，gzip 后约 `659 KB`。

## 四、自动化测试覆盖

- 后端核心接口：版本、扫码登录、无文件上传失败、登录状态。
- 多客户端实时通信：群聊广播、私聊定向发送、离线过滤、在线人数同步、混合传输协议。
- 消息协议：发送人昵称/IP 装饰。
- 前端状态逻辑：Socket 在线注册、事件分发、消息历史过滤与保存。
- 输入交互：发送历史导航、去重和条数上限。
- 开源治理：仓库地址、Git 忽略规则、埋点默认关闭。

## 五、需要人工测试覆盖

| 场景 | 步骤 | 预期 |
|---|---|---|
| 扫码登录 | 启动服务，手机扫码进入聊天页 | 页面顶部显示“在线”，后端输出 `[Socket] connected` |
| 双端群聊 | 电脑与手机进入群聊 | 双端都能实时收到消息，在线人数正确 |
| 双端私聊 | 双方选择对方发起私聊 | 双端实时收发，历史记录按会话展示 |
| 断线恢复 | 停止/启动服务后刷新页面 | 自动重连，状态恢复在线，消息继续收发 |
| 文件上传 | 上传图片和普通文件 | 图片可预览，文件可下载，上传进度正常 |
| 文件复制/下载 | 复制链接并打开 | 复制到剪贴板，链接可下载或预览 |
| 消息操作 | Pin、置顶、复制、二维码 | 操作状态正确，刷新后 Pin/置顶仍保留 |
| 群名/昵称 | 双端分别修改 | 双端列表和消息显示同步更新 |
| 缓存目录 | 复制、打开、修改路径 | 复制成功、目录打开正确、修改后重启生效 |
| 多语言 | 切换中英文 | 文案、标题、日期格式正确 |
| 离线状态 | 停止服务 | 页面显示“离线”，消息发送失败或恢复后可重试 |
| 遥测开关 | 不配置 key 和配置自己的 key | 不配置时无外发请求；配置后按用户配置工作 |

## 六、待改进

1. 为 `ChatLayout.vue` 持续拆分 Header、MessageList、Footer、ToolDrawer。
2. 为文件上传和 QR 生成补充更完整的测试。
3. 处理前端主包体积和 `vconsole` 安全提示。
4. 添加 lint/typecheck。
5. 增加真实双端 Socket 集成测试或 Playwright E2E。
