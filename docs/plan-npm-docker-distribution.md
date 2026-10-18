# ChatTransfer npm 包与 Docker 镜像分发方案

## 1. 背景

ChatTransfer 当前主要通过 GitHub Release 分发 macOS 和 Windows 可执行文件。这个方式适合桌面用户，但对开发者、测试工程师和 Linux 服务器用户不够方便：

1. 用户需要手动下载、解压并运行二进制文件。
2. Linux 服务器通常没有桌面环境，不能依赖自动打开浏览器。
3. 开发者更希望通过一条命令试用或启动服务。
4. 服务器部署需要稳定的数据持久化、端口配置和后台运行能力。

因此，分发目标调整为：

1. 第一阶段：发布 npm 包，支持 `npx chattransfer`。
2. 第二阶段：发布 Docker 镜像，支持一条命令后台运行。

## 2. 目标

### 2.1 npm 包

提供跨平台 npm 包：

```bash
npx chattransfer
```

或全局安装后运行：

```bash
npm install -g chattransfer
chattransfer
```

npm 包应支持：

1. macOS、Windows 和主流 glibc Linux 发行版。
2. Node.js 20 及以上版本。
3. 无桌面环境运行。
4. 自定义端口、监听地址、数据目录和对外访问地址。
5. 内置构建后的前端静态资源。
6. 默认不启用 telemetry。

### 2.2 Docker 镜像

提供官方 Docker 镜像：

```bash
docker run -d \
  --name chattransfer \
  --restart unless-stopped \
  -p 55555:55555 \
  -v chattransfer-data:/data \
  ghcr.io/turboxing/chattransfer:latest
```

Docker 镜像应支持：

1. 无桌面 Linux 服务器运行。
2. 数据目录挂载到 `/data`。
3. 容器退出后自动重启。
4. 通过环境变量配置端口、监听地址、数据目录和对外访问地址。
5. 与 npm 包使用同一套服务端逻辑。

## 3. 非目标

本方案第一阶段不包含：

1. Homebrew、winget、Scoop、Chocolatey、apt、yum 等系统包管理器。
2. 桌面悬浮窗。
3. 公网多租户部署。
4. 内置用户登录鉴权。
5. npm 安装后自动注册系统服务。
6. Alpine / musl 支持。
7. Linux arm64 支持。

这些能力可在 npm 和 Docker 方案稳定后单独评估。

## 4. 用户场景

### 4.1 开发者快速试用

用户希望不安装软件，直接运行：

```bash
npx chattransfer
```

期望结果：

1. 自动下载并启动 ChatTransfer。
2. 默认打开本机浏览器。
3. 终端输出局域网访问地址。
4. 手机可扫码加入。

### 4.2 Linux 无桌面服务器

用户在无桌面 Linux 服务器上运行：

```bash
npx chattransfer --no-browser
```

期望结果：

1. 不调用 `xdg-open`。
2. 服务监听 `0.0.0.0`。
3. 终端输出可访问地址。
4. 用户在电脑浏览器中访问该地址。
5. 聊天记录、上传文件和 SQLite 数据保存在服务器数据目录中。

### 4.3 Docker 服务器部署

用户希望用一条命令完成下载、启动、持久化和自动重启：

```bash
docker run -d \
  --name chattransfer \
  --restart unless-stopped \
  -p 55555:55555 \
  -v chattransfer-data:/data \
  ghcr.io/turboxing/chattransfer:latest
```

期望结果：

1. 容器后台运行。
2. 数据保存在 `chattransfer-data` 卷中。
3. 容器重启后历史记录和文件仍存在。
4. 局域网设备可通过服务器 IP 访问。

## 5. 功能需求

### 5.1 命令行入口

npm 包提供命令：

```bash
chattransfer
```

支持参数：

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--host` | 监听地址 | `0.0.0.0` |
| `--port` | 监听端口 | `55555` |
| `--data-dir` | 数据目录 | 按操作系统自动选择 |
| `--public-url` | 对外访问地址，用于二维码和页面链接 | 自动检测局域网地址 |
| `--no-browser` | 不打开本机浏览器 | 自动检测桌面环境 |
| `--version` | 输出版本号 | 无 |
| `--help` | 输出帮助信息 | 无 |

同时支持环境变量：

| 环境变量 | 对应参数 |
| --- | --- |
| `CHATTRANSFER_HOST` | `--host` |
| `CHATTRANSFER_PORT` | `--port` |
| `CHATTRANSFER_DATA_DIR` | `--data-dir` |
| `CHATTRANSFER_PUBLIC_URL` | `--public-url` |
| `CHATTRANSFER_NO_BROWSER` | `--no-browser` |

优先级：

1. 命令行参数
2. 环境变量
3. 默认值

### 5.2 无桌面模式

满足任一条件时进入无桌面模式：

1. 用户传入 `--no-browser`。
2. `CHATTRANSFER_NO_BROWSER=1`。
3. Linux 环境中不存在 `DISPLAY` 和 `WAYLAND_DISPLAY`。

无桌面模式下：

1. 不调用 `xdg-open`。
2. 不因无法打开浏览器而报错。
3. 在终端输出访问地址。
4. “打开缓存目录”接口返回路径，并提示服务器环境无法打开本机目录。

### 5.3 数据目录

npm 包不能把配置、数据库和上传文件写入全局包安装目录。

默认数据目录按操作系统选择：

| 系统 | 默认数据目录 |
| --- | --- |
| Linux | `$XDG_DATA_HOME/ChatTransfer`，未设置时为 `~/.local/share/ChatTransfer` |
| macOS | `~/Library/Application Support/ChatTransfer` |
| Windows | `%APPDATA%\ChatTransfer` |
| Docker | `/data` |

数据目录内包含：

```text
config.json
uploads/
chattransfer.db
tmp/
```

兼容策略：

1. 现有 `pkg` 单文件版本继续使用可执行文件所在目录，避免破坏已有用户数据。
2. npm 和 Docker 运行时使用独立数据目录。
3. 不自动迁移旧数据。
4. 用户可通过 `--data-dir` 显式指定旧目录。

### 5.4 对外访问地址

服务需要生成二维码和访问链接。

默认行为：

1. 自动检测本机局域网 IPv4 地址。
2. 拼接 `http://<ip>:<port>`。

当运行在以下环境时，自动检测可能不准确：

1. Docker。
2. 反向代理。
3. 多网卡服务器。
4. NAT 或 VPN。

因此必须支持：

```bash
chattransfer --public-url http://192.168.1.10:55555
```

或：

```bash
CHATTRANSFER_PUBLIC_URL=http://192.168.1.10:55555
```

### 5.5 npm 包内容

npm 包必须包含：

1. `server/`
2. `frontend/dist/`
3. `README.md`
4. `LICENSE`
5. `package.json`

不应包含：

1. `config.json`
2. `config/local.json`
3. `uploads/`
4. 日志文件
5. 测试文件
6. 发布脚本
7. 源码文档
8. 本地缓存
9. 生成二进制

`package.json` 需要增加：

1. `files` 白名单。
2. `bin` 命令映射。
3. `engines.node` 限制。
4. `prepublishOnly` 构建和测试脚本。

### 5.6 Docker 镜像

Docker 镜像要求：

1. 基础镜像使用 Node.js 20 LTS。
2. 使用多阶段构建。
3. 前端在构建阶段完成打包。
4. 运行阶段只保留运行所需文件。
5. 默认数据目录为 `/data`。
6. 默认不打开浏览器。
7. 使用非 root 用户运行。
8. 暴露 `55555` 端口。
9. 提供健康检查。
10. 镜像推送到 GitHub Container Registry。

镜像标签：

1. `ghcr.io/turboxing/chattransfer:<version>`
2. `ghcr.io/turboxing/chattransfer:latest`

## 6. 实现原理

### 6.1 npm 包结构

新增 CLI 入口文件，例如：

```text
bin/chattransfer.js
```

职责：

1. 解析命令行参数。
2. 读取环境变量。
3. 计算运行模式。
4. 计算数据目录。
5. 调用服务启动函数。

`server/index.js` 保留服务组装逻辑，不直接承担 CLI 解析职责。

### 6.2 运行时目录解析

新增运行时目录工具，例如：

```text
server/utils/runtime-paths.js
```

职责：

1. 判断当前是 `pkg`、npm 还是 Docker 运行时。
2. 返回配置文件路径。
3. 返回默认数据目录。
4. 返回上传目录。
5. 返回 SQLite 数据库路径。

判断规则：

| 运行时 | 判断方式 | 数据目录 |
| --- | --- | --- |
| `pkg` | `process.pkg` | 可执行文件所在目录 |
| Docker | `CHATTRANSFER_DATA_DIR=/data` 或容器标识 | `/data` |
| npm | 默认 | 操作系统用户数据目录 |

### 6.3 服务启动参数

将 `start()` 改造为接收配置对象：

```js
start({
  host,
  port,
  dataDir,
  publicUrl,
  openBrowser
})
```

服务启动流程：

1. 解析配置。
2. 创建数据目录。
3. 初始化缓存目录。
4. 初始化 SQLite 历史服务。
5. 注册 HTTP 路由。
6. 注册 Socket.IO。
7. 监听指定地址和端口。
8. 输出访问地址。
9. 按需打开浏览器。

### 6.4 前端静态资源

npm 发布前必须执行：

```bash
cd frontend
npm ci
npm run build
```

构建产物位于：

```text
frontend/dist/
```

服务端继续通过 Express 静态文件中间件托管该目录。

### 6.5 SQLite 原生模块

当前使用 `sqlite3@5.1.7`。

npm 安装时：

1. 优先下载对应平台的预编译二进制。
2. 如果预编译二进制不可用，则回退到源码编译。
3. Node.js 版本必须满足 `engines.node` 要求。

第一阶段支持：

1. macOS x64 / arm64
2. Windows x64
3. Linux x64 glibc

暂不支持：

1. Alpine / musl
2. Linux arm64

### 6.6 Docker 构建

Dockerfile 采用多阶段构建：

1. **frontend-build**
   - 安装前端依赖。
   - 构建 `frontend/dist`。
2. **runtime**
   - 安装服务端依赖。
   - 复制 `server/` 和 `frontend/dist/`。
   - 设置默认环境变量。
   - 暴露端口。
   - 配置健康检查。

容器内默认环境：

```text
CHATTRANSFER_HOST=0.0.0.0
CHATTRANSFER_PORT=55555
CHATTRANSFER_DATA_DIR=/data
CHATTRANSFER_NO_BROWSER=1
```

### 6.7 发布流程

#### npm 发布

在 GitHub tag 上触发：

1. 运行后端测试。
2. 构建前端。
3. 执行 `npm pack --dry-run` 检查包内容。
4. 发布 npm 包。
5. 输出包名、版本和 integrity。

发布命令：

```bash
npm publish --provenance
```

要求：

1. npm 账号开启 2FA。
2. GitHub Actions 配置 `NPM_TOKEN`。
3. 版本号与 Git tag 一致。
4. 发布前确认 `chattransfer` 包名可用。

#### Docker 发布

在 GitHub tag 上触发：

1. 构建多阶段 Docker 镜像。
2. 运行容器冒烟测试。
3. 推送到 GHCR。
4. 打版本标签和 `latest` 标签。

## 7. 安全要求

1. npm 包和 Docker 镜像不得包含 API key。
2. `config.json` 和 `config/local.json` 不得进入包或镜像。
3. telemetry 默认关闭。
4. 用户未显式配置 API key 时，不得上报任何数据。
5. Docker 镜像使用非 root 用户。
6. 数据目录权限应仅限当前用户访问。
7. 默认面向局域网或可信内网，不鼓励直接暴露公网。
8. 如果需要公网访问，应通过 VPN、防火墙或反向代理加鉴权。

## 8. 测试计划

### 8.1 单元测试

新增或补充：

1. CLI 参数解析测试。
2. 环境变量优先级测试。
3. 数据目录解析测试。
4. 无桌面模式判断测试。
5. `publicUrl` 生成测试。

### 8.2 npm 包测试

在干净环境中执行：

```bash
npm pack
npm install -g ./chattransfer-<version>.tgz
chattransfer --help
chattransfer --version
chattransfer --no-browser
```

验证：

1. 包内容符合白名单。
2. 全局命令可执行。
3. 前端页面可访问。
4. Socket.IO 连接正常。
5. SQLite 初始化成功。
6. 文件上传成功。
7. 历史记录可恢复。

### 8.3 Docker 测试

执行：

```bash
docker build -t chattransfer:test .
docker run -d --name chattransfer-test -p 55555:55555 -v chattransfer-test-data:/data chattransfer:test
```

验证：

1. 容器正常启动。
2. 健康检查通过。
3. 页面可访问。
4. 数据写入 `/data`。
5. 容器重启后历史仍在。
6. 上传文件仍在。

## 9. 验收标准

### 9.1 npm 阶段

1. `npx chattransfer` 可直接启动。
2. `npm install -g chattransfer` 后 `chattransfer` 可启动。
3. `chattransfer --no-browser` 在无桌面 Linux 上可用。
4. `chattransfer --help` 和 `--version` 输出正确。
5. 数据不会写入 npm 全局包目录。
6. npm 包不包含敏感配置和运行数据。
7. macOS、Windows、Linux x64 至少各完成一次安装验证。
8. `npm test` 和前端构建通过。

### 9.2 Docker 阶段

1. `docker build` 成功。
2. `docker run` 一条命令可后台启动。
3. `/data` 中的数据在容器重启后保留。
4. 容器默认不尝试打开浏览器。
5. 镜像推送到 GHCR。
6. `latest` 和版本标签均可用。
7. 官方 README 提供安装和运行命令。

## 10. 实施顺序

### 第一阶段：npm 包

1. 新增 CLI 入口。
2. 支持参数和环境变量。
3. 支持无桌面模式。
4. 重构运行时数据目录。
5. 配置 npm `files`、`bin` 和 `engines`。
6. 增加包内容检查。
7. 增加 npm 发布 workflow。
8. 更新 README 和发布文档。

### 第二阶段：Docker 镜像

1. 新增 Dockerfile。
2. 增加健康检查接口。
3. 增加 Docker 冒烟测试。
4. 增加 GHCR 发布 workflow。
5. 更新 README 和部署文档。

## 11. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| npm 包名被占用 | 无法使用 `chattransfer` | 发布前确认包名；必要时使用 `@turboxing/chattransfer` |
| `sqlite3` 原生模块编译失败 | 安装失败 | 明确 Node 版本；优先支持主流平台；提供 Docker 替代方案 |
| 全局 npm 目录不可写 | 运行失败 | 数据目录与安装目录分离 |
| Docker 中自动检测 IP 不准确 | 二维码不可用 | 支持 `CHATTRANSFER_PUBLIC_URL` |
| 无桌面环境调用浏览器失败 | 服务启动失败 | 默认启用 headless 模式 |
| 包内容误包含敏感文件 | 安全风险 | 使用 `files` 白名单并增加包内容测试 |
| 公网裸奔访问 | 数据泄露 | 文档明确仅限局域网或加 VPN / 反向代理 |

## 12. 后续扩展

npm 和 Docker 稳定后，可继续评估：

1. Homebrew tap。
2. winget manifest。
3. Scoop bucket。
4. Chocolatey 包。
5. `.deb` / `.rpm` 系统包。
6. Linux arm64 镜像。
7. Docker Compose 示例。
8. 反向代理部署示例。
