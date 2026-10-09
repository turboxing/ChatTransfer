# Issue #1 实现方案 — 自定义昵称 / 群名称 / 显示IP

> GitHub Issue: https://github.com/turboxing/ChatTransfer/issues/1
> 目标版本: v2.0.9.0

## 一、需求分析

| 需求 | 现状 | 目标 |
|------|------|------|
| 修改用户名 | 用户身份是随机 UUID（如 `a1b2c3d4-...`），无友好名称 | 用户可设置昵称，所有端可见 |
| 修改群组名字 | 群聊固定叫 `group_chat`，无自定义 | 任何成员可修改群名称，实时同步 |
| 名字下方显示IP | 无 IP 显示 | 在用户昵称下方显示其局域网 IP |

## 二、核心设计思路

引入 `nickname`、`groupName`、`senderIp` 三个新概念，与现有 `sender`(UUID) 解耦：

```
现有体系:  sender = UUID（身份标识，不变）
新增体系:  nickname = 用户自定义昵称（显示名称，可改）
           groupName = 群组自定义名称（可改）
           senderIp = 用户IP（自动获取，只读）
```

**为什么不改 sender？** `sender` 作为 UUID 是 Socket.IO 用户注册、消息路由、历史记录关联的核心键，改动成本极高。昵称只是一个"显示层"属性，覆盖在 UUID 之上。

## 三、数据流设计

### 3.1 昵称设置流程

```
用户A设置昵称 "小明"
  ↓
Socket 事件: update_nickname { sender: "uuid-a", nickname: "小明" }
  ↓
服务端: global.users["uuid-a"].nickname = "小明"
  ↓
广播: user_list_updated → 所有客户端更新在线用户列表
  ↓
后续消息: sender_nickname = "小明" 附加到消息体
```

### 3.2 群名称修改流程

```
任意用户修改群名为 "内部测试群"
  ↓
Socket 事件: update_group_name { groupName: "内部测试群", updatedBy: "小明" }
  ↓
服务端: global.groupName = "内部测试群"
  ↓
广播: group_name_updated → 所有客户端更新头部显示
```

### 3.3 IP 获取方式

Socket.IO 握手时从 `socket.handshake.address` 或 `socket.request.connection.remoteAddress` 获取客户端 IP，在用户上线（`group_online`）时记录到 `global.users[sender].ip`。

## 四、服务端改动（`server/io.js`）

### 4.1 数据结构变更

```javascript
// 变更前
global.users = {
  "uuid-a": { socketId: "xxx", status: "ONLINE" }
}

// 变更后
global.users = {
  "uuid-a": {
    socketId: "xxx",
    status: "ONLINE",
    nickname: "小明",        // ← 新增
    ip: "192.168.1.100"     // ← 新增
  }
}
global.groupName = "内部测试群"  // ← 新增
```

### 4.2 新增 Socket 事件

| 事件 | 方向 | 数据 | 说明 |
|------|------|------|------|
| `update_nickname` | C→S | `{ sender, nickname }` | 修改昵称 |
| `update_group_name` | C→S | `{ groupName, updatedBy }` | 修改群名 |
| `get_group_info` | C→S | 无 | 请求当前群名和在线用户列表 |
| `user_list_updated` | S→C | `{ users: [{sender, nickname, ip, status}] }` | 在线用户列表变更广播 |
| `group_name_updated` | S→C | `{ groupName, updatedBy }` | 群名变更广播 |

### 4.3 修改现有事件

**`group_online`：**
- 接收时记录客户端 IP（从 handshake 获取）
- 接收时记录 nickname（客户端传入）
- 完成后广播 `user_list_updated`

**`group_chat`：**
- 消息体附加 `sender_nickname`（从 `global.users[sender].nickname` 读取）
- 消息体附加 `sender_ip`（从 `global.users[sender].ip` 读取）

## 五、前端改动

### 5.1 Login.vue — 登录页增加昵称输入

```
改造前:
┌──────────────────────────┐
│      扫码登录中...        │
│    登录成功，即将跳转···   │
└──────────────────────────┘

改造后:
┌──────────────────────────┐
│                          │
│  昵称: [____________]    │  ← 新增，自动填充随机名
│                          │
│       [加入聊天]         │  ← 点击后进入聊天页
│                          │
└──────────────────────────┘
```

实现要点：
- 自动生成默认昵称：`用户_XXXX`（取 UUID 后4位）
- 昵称存入 localStorage（key: `im_chat_nickname`），下次自动填充
- 用户可修改后点击进入
- 昵称通过 URL query param 传递到 Chat 页：`/chat?sender=uuid&receiver=group_chat&nickname=小明`

### 5.2 ChatLayout.vue — 聊天页头部改造

```
改造前:
┌──────────────────────────────┐
│  group_chat          🟢在线  │
└──────────────────────────────┘

改造后:
┌──────────────────────────────┐
│  内部测试群           🟢在线  │  ← 群名称，可点击编辑
│  3人在线                      │  ← 在线人数
└──────────────────────────────┘
```

### 5.3 消息气泡改造

```
改造前:
┌─────────────────────────┐
│ a1b2c          10:30 AM │  ← UUID后5位
│ 你好，这是一条消息       │
└─────────────────────────┘

改造后:
┌─────────────────────────┐
│ 小明             10:30 AM│  ← 昵称
│ 192.168.1.100           │  ← IP（小字灰色）
│ 你好，这是一条消息       │
└─────────────────────────┘
```

- 昵称显示：`sender_nickname` 字段，无则回退到 `sender.slice(-5)`（兼容旧消息）
- IP 显示：`sender_ip` 字段，无则不显示（兼容旧消息）
- 昵称变更后，历史消息中的昵称快照不变（保留发送时的昵称，避免混乱）

### 5.4 工具抽屉新增

```
┌─ 设置 ─────────────────────┐
│ 语言: [跟随系统 ▼]         │
│ ─────────────────────────  │
│ 我的昵称: [小明      ] ✏️  │  ← 新增，可编辑
│ 群名称:   [内部测试群] ✏️  │  ← 新增，可编辑
│ ─────────────────────────  │
│ 常用功能                   │
│ ...                        │
└────────────────────────────┘
```

### 5.5 localStorage 新增 key

| Key | 说明 |
|-----|------|
| `im_chat_nickname` | 用户自定义昵称 |
| `im_chat_group_name` | 群名称缓存（离线时展示） |

## 六、消息体新增字段

```javascript
{
  // ... 原有字段（sender, receiver, msgType, text, fileUrl, createTime, msgId 等）
  sender_nickname: "小明",    // 发送者昵称（新增）
  sender_ip: "192.168.1.100" // 发送者IP（新增）
}
```

## 七、i18n 新增词条

### zh-CN.json 新增

```json
{
  "chat": {
    "myNickname": "我的昵称",
    "groupName": "群名称",
    "nicknamePlaceholder": "输入昵称",
    "groupNamePlaceholder": "输入群名称",
    "nicknameUpdated": "昵称已更新",
    "groupNameUpdated": "群名称已更新",
    "onlineCount": "{count}人在线",
    "defaultGroupName": "群聊",
    "editNickname": "编辑昵称",
    "editGroupName": "编辑群名称"
  },
  "login": {
    "nicknameLabel": "昵称",
    "nicknamePlaceholder": "输入你的昵称",
    "joinChat": "加入聊天"
  }
}
```

### en.json 新增

```json
{
  "chat": {
    "myNickname": "My Nickname",
    "groupName": "Group Name",
    "nicknamePlaceholder": "Enter nickname",
    "groupNamePlaceholder": "Enter group name",
    "nicknameUpdated": "Nickname updated",
    "groupNameUpdated": "Group name updated",
    "onlineCount": "{count} online",
    "defaultGroupName": "Group Chat",
    "editNickname": "Edit nickname",
    "editGroupName": "Edit group name"
  },
  "login": {
    "nicknameLabel": "Nickname",
    "nicknamePlaceholder": "Enter your nickname",
    "joinChat": "Join Chat"
  }
}
```

## 八、文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `server/io.js` | 修改 | 新增 nickname/IP/groupName 相关事件和逻辑 |
| `frontend/src/views/Login.vue` | 修改 | 增加昵称输入框，传递 nickname 到 Chat |
| `frontend/src/components/ChatLayout.vue` | 修改 | 头部显示群名/在线人数，消息气泡显示昵称+IP，设置抽屉新增昵称/群名编辑 |
| `frontend/src/i18n/locales/zh-CN.json` | 修改 | 新增中文词条 |
| `frontend/src/i18n/locales/en.json` | 修改 | 新增英文词条 |
| `frontend/src/data/changelog.js` | 修改 | 新增 v2.0.9.0 更新记录 |
| `package.json` | 修改 | 版本号 2.0.8.9 → 2.0.9.0 |

**预计工作量：** 7 个文件，核心代码约 300 行新增/修改。

## 九、边界情况处理

| 场景 | 处理方式 |
|------|----------|
| 昵称为空 | 自动生成 `用户_XXXX`（UUID 后4位） |
| 群名为空 | 显示默认 "群聊" / "Group Chat" |
| 旧消息无 nickname | 回退显示 `sender.slice(-5)`（现有逻辑） |
| 旧消息无 IP | 不显示 IP 行 |
| 昵称重复 | 允许（局域网场景，无唯一性要求） |
| 用户刷新页面 | 新 UUID + localStorage 中昵称自动填充 |
| 多人同时改群名 | 最后写入生效，广播同步 |
| 离线用户 | 显示昵称 + OFFLINE 状态，不显示 IP |

## 十、验收标准

- [ ] 登录页可输入/修改昵称，默认自动生成
- [ ] 聊天页头部显示群名称，可点击编辑，所有端实时同步
- [ ] 聊天页头部显示在线人数
- [ ] 消息气泡中显示发送者昵称（而非 UUID 片段）
- [ ] 每个用户昵称下方显示其局域网 IP
- [ ] 我的昵称可在设置中修改，实时同步到所有端
- [ ] 群名修改后所有端实时同步
- [ ] 历史消息正常兼容（旧消息显示原有格式）
- [ ] 中英文 i18n 完整
- [ ] 版本号升级到 2.0.9.0，changelog 更新
