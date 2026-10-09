# ChatTransfer 项目功能总结

## 整体概览

ChatTransfer 是一款局域网即时通讯与文件传输工具，基于 **Express + Socket.IO** 实现实时聊天，前端使用 **Vue 3 + Element Plus** 构建现代化 UI。

### 核心功能

- 扫码即连：启动后自动生成二维码，手机扫码即可在浏览器中打开聊天页面
- 实时群聊：支持多人同时在线，消息实时同步
- 文件传输：支持文本、图片、各类文件的秒级互传
- 批量上传：支持拖拽批量上传文件
- Pin 消息：将重要消息固定在顶部，方便查看
- 置顶消息：将某条消息置顶显示
- 聊天记录：本地缓存聊天记录，支持清空操作
- 跨平台：支持 Windows、macOS 系统

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        ChatTransfer                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Vue 3 + Vite)                                    │
│  ├── Vue Router (路由管理)                                   │
│  ├── Element Plus (UI 组件库)                                │
│  ├── vue-element-plus-x (聊天组件)                           │
│  └── Socket.IO Client (实时通信)                             │
├─────────────────────────────────────────────────────────────┤
│  Backend (Node.js + Express)                                │
│  ├── Express (HTTP 服务)                                     │
│  ├── Socket.IO (WebSocket 实时通信)                          │
│  ├── express-fileupload (文件上传)                           │
│  └── qr-image (二维码生成)                                   │
├─────────────────────────────────────────────────────────────┤
│  Build & Package                                            │
│  ├── Vite (前端构建)                                         │
│  └── pkg (打包为可执行文件)                                   │
└─────────────────────────────────────────────────────────────┘
```

## 项目结构

```
ChatTransfer/
├── server/                    # 后端服务
│   ├── app.js                 # Express 服务入口
│   ├── io.js                  # Socket.IO 事件处理
│   ├── tool.js                # 工具函数
│   ├── analytics.js           # 数据统计
│   └── routes/                # API 路由
├── frontend/                  # 前端 Vue 项目
│   ├── src/
│   │   ├── views/             # 页面组件 (Home, Chat, Login)
│   │   ├── components/        # 通用组件 (ChatLayout)
│   │   ├── router/            # 路由配置
│   │   └── styles/            # 样式文件
│   ├── public/                # 前端静态资源
│   └── package.json
├── package.json               # 项目配置
└── publish.sh                 # 打包脚本
```

## 后端功能（server）

### HTTP 服务与静态资源

- 使用 `express` 启动 HTTP 服务，默认端口 `50001`（见 `server/app.js`）
- 静态资源目录：
  - `frontend/dist/`：Vue 构建产物
  - `uploads/`：用户上传文件缓存目录
- 服务启动后：
  - 调用 `initCachePath` 初始化缓存目录（不存在则创建）
  - 初始化成功后，通过 `openDefaultBrowser` 自动用系统默认浏览器打开首页 URL

### Socket.IO 实时通信（server/io.js）

- 使用 Socket.IO 维护 `global.users` 在线用户表：
  - 结构：`global.users = { username: { socketId, status: 'ONLINE' | 'OFFLINE' } }`

#### 主要事件

| 事件名 | 说明 | 处理逻辑 |
|--------|------|----------|
| `group_online` | 用户上线 | 加入群聊房间 `group-chat`，记录 socketId 和在线状态 |
| `group_chat` | 群聊消息 | 补充 createTime、msgId 等字段，广播给房间内其他成员 |
| `private_chat` | 私聊消息 | 点对点发送（保留扩展用） |
| `disconnect` | 用户断开 | 将用户状态标记为 OFFLINE |

### 工具函数（server/tool.js）

| 函数名 | 功能 |
|--------|------|
| `getIPAddress()` | 获取局域网 IPv4 地址，用于生成二维码 |
| `openDefaultBrowser(url)` | 根据系统平台自动打开默认浏览器 |
| `getAppWritableRoot()` | 获取可写根目录（兼容 Dev 和 Pkg 环境） |
| `initCachePath(cachePath, callback)` | 初始化缓存目录 |
| `geneQR(url)` | 生成二维码 Base64 字符串 |
| `homeDir` | 当前用户主目录 |

### 上传接口

- `POST /uploadFile`
  - 使用 `express-fileupload` 中间件接收文件
  - 支持批量上传（参数字段名兼容 `file_data` 和 `fileObj`）
  - 将文件保存到 `uploads/files/<文件名>`
  - 返回数据：`name`、`mimetype`、`size`、`fileUrl`、`localFilePath`

### 业务路由（server/routes）

| 路由 | 方法 | 功能 |
|------|------|------|
| `/getIndexInfo` | GET | 返回 A/B 终端的二维码和跳转链接 |
| `/getIndexInfo2` | GET | 生成登录 URL 和二维码 |
| `/getHomeDir` | GET | 返回缓存目录路径 |
| `/openCachePath` | POST | 打开缓存目录 |
| `/geneQR` | GET | 通用二维码生成接口 |
| `/geneBUserQR` | GET | 为 B 端用户生成登录二维码 |
| `/scanLogin` | GET | 处理扫码登录 |
| `/checkLogin` | GET | 检查在线用户状态 |
| `/getVersionInfo` | GET | 获取版本信息 |
| `/api/track` | POST | 数据统计上报 |

## 前端功能（frontend）

### 页面结构

| 页面 | 路由 | 功能 |
|------|------|------|
| Home | `/` | 首页，展示二维码 |
| Login | `/login` | 扫码登录页 |
| Chat | `/chat` | 聊天主页面 |

### 核心组件 ChatLayout.vue

聊天页面的核心组件，包含以下功能区域：

#### 头部区域
- 显示目标用户和在线状态
- 功能按钮：Pin 消息、全屏二维码、设置工具

#### 消息置顶栏
- 显示当前置顶的消息
- 点击可跳转到对应消息位置

#### 文件拖拽上传区
- 使用 `Attachments` 组件实现拖拽上传
- 支持批量文件上传

#### 消息气泡列表
- 使用 `BubbleList` 组件展示消息
- 支持三种消息类型：文本、图片、文件
- 每条消息提供操作按钮：打开、下载、复制、二维码、重发

#### 底部输入区
- 消息输入框，支持粘贴图片/文件
- 文件上传按钮

#### 工具抽屉
- 群聊二维码
- 复制缓存路径
- 打开缓存目录
- 清空聊天记录
- 版本信息展示

#### Pin 消息抽屉
- 展示所有 Pin 的消息
- 支持按类型筛选：全部、文字、文件、图片、链接

### 消息结构

```javascript
{
  sender: '用户名',
  receiver: '接收方',
  msgType: 'TEXT' | 'FILE' | 'IMAGE',
  text: '文本内容',
  fileUrl: '文件URL',
  fileType: 'MIME类型',
  fileName: '文件名',
  fileSize: '文件大小',
  createTime: '消息时间',
  msgId: '唯一ID',
  senderPhotoNickname: '昵称简写'
}
```

## 本地聊天记录管理

- 使用 `localStorage` 存储聊天记录
- 支持加载、保存、清空操作
- 页面刷新后自动加载历史记录

## 数据统计

- 使用 `analytics.js` 实现事件追踪
- 支持页面访问（PV）和消息行为统计
- 通过 `/api/track` 接口上报数据

## 打包与发布

### 开发模式

```bash
npm run dev
```

### 打包为可执行文件

```bash
sh publish.sh mac    # 打包 macOS 版本
sh publish.sh win    # 打包 Windows 版本
sh publish.sh all    # 同时打包两个平台
```

打包后的文件位于 `dist/` 目录。

## 后续可扩展方向

- 增强扫码登录流程：增加昵称输入、身份校验
- 完善私聊模式：实现真正的一对一会话
- 平台兼容性：为 Windows、Linux 补充打开缓存目录功能
- 聊天记录增强：提供导出/导入功能
- UI 体验优化：更适配移动端的布局与手势
- 多语言支持：支持中英文切换
