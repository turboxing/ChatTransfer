# Pin 置顶功能技术方案

## 一、功能概述

参考飞书会话顶部功能设计，实现消息置顶功能：
- 在会话顶部展示被 pin 的消息
- 点击可打开侧边栏，展示所有被 pin 的消息列表
- 支持按文件、链接等分类筛选（后续扩展）
- 在聊天气泡的 header 区域增加 pin 按钮，用户可 pin/取消 pin 消息

## 二、数据结构设计

### 2.1 存储键名

```javascript
const pinStoreKey = 'im_chat_pin';
```

### 2.2 存储格式

```json
{
  "msgId_123": {
    "msgId": "msgId_123",
    "sender": "UserA",
    "receiver": "UserB",
    "text": "消息内容",
    "msgType": "TEXT",
    "fileUrl": "https://...",
    "fileType": "image/png",
    "createTime": "2024-01-01 12:00:00",
    "pinTime": "2024-01-01 12:05:00",
    "senderPhotoNickname": "UA"
  }
}
```

### 2.3 字段说明

| 字段 | 类型 | 说明 |
|-----|------|-----|
| msgId | string | 消息唯一标识 |
| sender | string | 发送者 |
| receiver | 接收者 |
| text | string | 消息文本内容 |
| msgType | string | 消息类型：TEXT/FILE/IMAGE |
| fileUrl | string | 文件/图片地址 |
| fileType | string | 文件 MIME 类型 |
| createTime | string | 消息创建时间 |
| pinTime | string | 置顶时间 |
| senderPhotoNickname | string | 发送者头像昵称 |

## 三、UI 设计

### 3.1 顶部 Pin 区域

位置：导航栏下方，聊天内容区域上方

```
┌─────────────────────────────────────────┐
│  📌 [消息内容摘要...] [取消]            │
└─────────────────────────────────────────┘
```

- 显示最新一条被 pin 的消息摘要（最多显示约30字）
- 点击区域可展开侧边栏
- 右侧显示取消按钮，点击可取消 pin
- 无 pin 消息时该区域隐藏

### 3.2 Pin 侧边栏

使用 Bootstrap Offcanvas 实现，从右侧滑出

```
┌──────────────┐
│  📌 置顶消息  │  ← 标题栏（可关闭）
├──────────────┤
│  🔍 筛选:    │
│  [全部] [文件]│ [链接] [图片]        │
├──────────────┤
│  ┌─────────┐ │
│  │ 消息1   │ │  ← 可点击定位到原消息
│  │ 摘要... │ │
│  │ 2024/1/1│ │
│  └─────────┘ │
│  ┌─────────┐ │
│  │ 消息2   │ │
│  │ 摘要... │ │
│  │ 2024/1/2│ │
│  └─────────┘ │
│              │
└──────────────┘
```

### 3.3 聊天气泡 Pin 按钮

位置：每条消息的 header 区域（用户名旁边）

```
┌──────────────────────────┐
│ 👤 用户名        12:30 📌│  ← Pin 按钮在时间后面
│ 消息内容...              │
└──────────────────────────┘
```

- 使用图钉图标表示
- 已 pin 的消息显示填充状态，未 pin 显示轮廓状态
- 点击切换 pin 状态

## 四、文件修改清单

| 序号 | 文件路径 | 修改内容 |
|-----|---------|---------|
| 1 | `public/js/chatRecordManager.js` | 添加 pin 消息存储方法 |
| 2 | `public/chat.html` | 添加顶部 Pin 区域、侧边栏、Pin 按钮 UI |
| 3 | `public/js/chat.js` | 添加 Pin 交互逻辑、渲染逻辑 |
| 4 | `public/css/chat.css` | 添加 Pin 相关样式 |

## 五、API 设计

### 5.1 chatRecordManager.js 新增方法

```javascript
// 加载所有 pin 消息
function loadAllPinMsgs()

// 保存 pin 消息
function savePinMsg(msgObj)

// 移除 pin 消息
function removePinMsg(msgId)

// 检查消息是否被 pin
function isMsgPinned(msgId)

// 清除所有 pin 消息
function clearAllPinMsgs()
```

### 5.2 chat.js 新增函数

```javascript
// 初始化 Pin 功能
function initPinFeature()

// 渲染顶部 Pin 区域
function renderPinBar()

// 渲染 Pin 侧边栏
function renderPinSidebar()

// 处理 Pin 按钮点击
function handlePinClick(msgId, msgObj)

// 滚动到指定消息位置
function scrollToMsg(msgId)
```

## 六、实现步骤

### 步骤 1：扩展 chatRecordManager.js

实现 pin 消息的存储相关方法

### 步骤 2：修改 chat.html

- 在 `#chatHeaderCenter` 下方添加顶部 Pin 区域 `#pinBar`
- 添加侧边栏 Offcanvas 结构
- 在消息模板中添加 Pin 按钮

### 步骤 3：修改 chat.js

- 页面加载时初始化 Pin 功能
- 在 `renderMessage` 中添加 Pin 按钮
- 实现 Pin 交互逻辑
- 实现侧边栏筛选功能

### 步骤 4：添加样式（chat.css）

- 顶部 Pin 区域样式
- 侧边栏样式
- Pin 按钮样式
- 动画效果

## 七、可扩展功能（后续）

1. **分类筛选**：文件、链接、图片等类型的 pin 消息
2. **多 pin 滑动**：顶部支持左右滑动切换多条 pin 消息
3. **排序功能**：按 pin 时间或消息类型排序
4. **多设备同步**：如需多设备同步，可考虑服务端存储
5. **拖拽排序**：支持自定义 pin 消息的显示顺序

## 八、注意事项

1. 消息被 pin 后不影响正常聊天记录的顺序
2. 取消 pin 时需要从 localStorage 中移除
3. 需要处理消息被删除时自动取消 pin 的场景
4. 顶部 Pin 区域需要处理内容溢出的情况
5. 侧边栏需要限制最大高度并支持滚动