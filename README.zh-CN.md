# ChatTransfer（聊天快传）

[![GitHub Downloads](https://img.shields.io/github/downloads/turboxing/ChatTransfer/total?style=flat-square&logo=github&color=44cc11)](https://github.com/turboxing/ChatTransfer/releases)
[![GitHub Release](https://img.shields.io/github/v/release/turboxing/ChatTransfer?style=flat-square&color=fe7d37)](https://github.com/turboxing/ChatTransfer/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/turboxing/ChatTransfer?style=flat-square&color=a4a61d)](https://github.com/turboxing/ChatTransfer/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/turboxing/ChatTransfer?style=flat-square&color=dfb317)](https://github.com/turboxing/ChatTransfer/stargazers)
[![MIT License](https://img.shields.io/github/license/turboxing/ChatTransfer?style=flat-square&color=007ec6)](./LICENSE)

[English](./README.md) | 简体中文 | [العربية](./README.ar.md)

> 一款面向开发者、测试人员和小团队的极简局域网聊天与文件互传工具。扫码即用，无需账号、无需云上传、无需额外安装 App，即可在浏览器中实时互发文字、图片和文件。

## 演示

- [YouTube 演示](https://www.youtube.com/watch?v=gZxeBqd7vbY)
- [B 站演示](https://www.bilibili.com/video/BV13QJp6vE3r/?vd_source=b4939bcf1ffecbca608b946bbdd9c475)

## 为什么做 ChatTransfer

我本职是一名测试工程师。日常工作里，我经常要在电脑和测试手机之间来回传东西：安装包、测试参数、链接要发到手机；日志、截图、录屏又要从手机回传到电脑。很多时候同事也会随口来一句：

- “刚刚录屏怎么传到电脑上？”
- “测试包要装手机上，是不是还得装开发工具？”
- “能把这张图片生成一个链接吗？”
- “这个链接能不能直接生成二维码？”

这些看似小事，往往临时要用的时候最费时间。我希望 ChatTransfer 能把这类“随手分享”的动作做到足够简单。

这些需求都很“临时”，但解决起来总是很“重”：装个 IM、登账号、传三方平台、传完怕隐私还得卸载，借来的测试机还要恢复干净……反复折腾，浪费时间。于是我在周末开发了 ChatTransfer：一个跨平台、免安装、用完即走的局域网互传工具，尽量把“临时跨设备传输”这件事做得简单、可控、无负担。经过我长达 3 年的迭代，ChatTransfer 已经在多个场景下被证明是有效的。所以决定把它上传到这里，分享给大家！

这个工具我自己每天都在用，也会持续根据真实场景迭代。软件长期免费，如果你在使用中遇到任何问题、或者对功能有更好的想法，欢迎在仓库的 Issues 里提建议；你的反馈会直接帮助它变得更好。

## 核心功能

- **扫码即连** — 启动后自动生成二维码，手机扫码即可在浏览器中打开聊天页面。
- **实时群聊** — 多人同时在线，消息实时同步。
- **文件传输** — 支持文本、图片、各类文件的秒级互传。
- **批量上传** — 支持拖拽批量上传文件。
- **Pin 与置顶消息** — 固定重要消息，方便随时查看。
- **消息二维码** — 任意消息皆可生成二维码，方便分享。
- **本地聊天记录** — 本地缓存聊天记录，支持清空。
- **跨平台** — 支持 Windows 和 macOS。
- **多语言界面** — 支持中文和英文切换。

## 使用场景

- **电脑 ↔ 电脑** — 开发联调时互传日志、配置片段、测试包、截图和链接。
- **电脑 ↔ 手机** — 把调试链接、二维码、截图发到手机，或把照片、录屏回传到电脑。
- **手机 ↔ 手机** — 小团队临时共享文件，不想再安装一个复杂 IM。
- **现场演示** — 会议中即时分发资料，无需加好友。

## 下载与安装

前往 [Releases](https://github.com/turboxing/ChatTransfer/releases) 页面下载最新可执行文件。

| 系统 | 文件 |
|------|------|
| macOS | `ChatTransfer-macos-x64-v{版本号_下划线}` |
| Windows | `ChatTransfer-windows-x64-v{版本号}.exe` |

### Windows

1. 下载 Windows 可执行文件。
2. 双击运行。
3. 如果系统出现安全提示，选择 **允许运行**。

### macOS

1. 下载 macOS 可执行文件，并移动到你想保存的位置。
2. 如果首次运行提示“无法验证开发者”，先点击 **取消**。
3. 打开 **系统设置 → 隐私与安全性**，点击 **仍然允许**，并输入密码。
4. 再次打开应用，在确认弹窗中选择 **打开**。

应用启动后会自动打开浏览器并显示二维码，手机扫码即可加入聊天。

## 从源码运行

### 环境要求

- Node.js 20+
- npm 9+

### 命令

```bash
npm install
cd frontend
npm install
cd ..
npm run dev
```

应用默认运行在 `http://localhost:55555`。

前端单独开发：

```bash
cd frontend
npm run dev
```

### 测试与构建

```bash
npm test
cd frontend
npm run build
```

### 打包

```bash
sh publish.sh mac
sh publish.sh win
sh publish.sh all
```

打包产物会输出到 `dist/`。

## 平台支持

- macOS 10.15+
- Windows 10+
- 桌面或移动端的现代浏览器
- 预编译可执行文件无需安装 Node.js 或其他依赖

## 技术架构

ChatTransfer 使用轻量、聚焦的技术栈：

- **前端：** Vue 3、Vite、Vue Router、Element Plus、Socket.IO Client。
- **后端：** Node.js、Express、Socket.IO、`express-fileupload`。
- **打包：** 使用 `pkg` 生成 macOS 和 Windows 独立可执行文件。

### 项目结构

```text
ChatTransfer/
├── server/       # Express API、Socket.IO 事件、服务与埋点
├── frontend/     # Vue 3 应用
├── tests/        # 后端与仓库级测试
├── docs/         # 开发、发布与埋点文档
├── release/      # 发布页文档与更新日志
└── publish.sh    # 打包脚本
```

更多细节见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 隐私与安全

- 聊天记录和文件默认仅保存在本机。
- 传输只发生在局域网内。
- 无账号体系，无内置云存储。
- 埋点默认关闭，开源版本不包含任何提供方 key。
- 如果你启用埋点，需要在 `config/local.json` 中填写自己的 API key；没有 key 时不会发起任何外部埋点请求。

详见 [docs/telemetry.md](./docs/telemetry.md)。

## 开发

- [开发指南](./docs/development.md)
- [发布指南](./docs/release.md)
- [贡献指南](./CONTRIBUTING.md)
- [行为准则](./CODE_OF_CONDUCT.md)

## 常见问题

**扫码后页面打不开。**
请确认手机和电脑是否在同一个局域网。

**文件传输失败。**
请检查文件是否超过限制大小，然后重新上传。

**如何切换语言？**
点击右上角 **设置**，选择语言。

## 更新日志

见 [release/CHANGELOG.md](./release/CHANGELOG.md)。

## 许可证

[MIT License](./LICENSE)

## 作者

Created by suncx.
