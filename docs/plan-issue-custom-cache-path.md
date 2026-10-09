# Issue 实现方案 — 用户自定义缓存目录

> 目标:允许用户在设置中自定义缓存(上传文件)目录,支持迁移已有文件,重启后生效。

## 一、需求分析

| 需求 | 现状 | 目标 |
|------|------|------|
| 自定义缓存目录 | 缓存目录硬编码为 `getAppWritableRoot()/uploads`,无法修改 | 用户可在设置中输入绝对路径,作为新的缓存目录 |
| 迁移已有文件 | 切换目录后旧文件丢失 | 提供「迁移已有文件」选项,默认勾选,递归复制旧目录内容 |
| 配置持久化 | 无配置文件 | 新增 `config.json` 持久化用户选择 |
| 生效方式 | 无 | 修改后需重启进程(Express 中间件运行时不可热切换) |

## 二、核心设计思路

引入配置文件 `config.json` 作为「缓存目录指针」,与具体目录解耦:

```
现有体系:  uploadsDir = getAppWritableRoot() + '/uploads'  (硬编码)
新增体系:  uploadsDir = config.cachePath || (getAppWritableRoot() + '/uploads')
                                    ↑
                        由 config.json 持久化,启动时读取
```

**为什么需要重启?** `express.static(uploadsDir)` 和 `fileUpload({ tempFileDir })` 在 `app.js` 启动时挂载,Express 中间件运行时无法热切换。因此自定义路径必须在进程启动时读取,修改后需重启进程才生效。

**为什么不自动重启?** pkg 打包的单文件可执行环境下自重启风险大(进程退出后无法保证子进程拉起),改由用户手动重启,UI 明确提示。

## 三、数据流设计

### 3.1 启动流程

```
进程启动
  ↓
读取 config.json
  ↓
uploadsDir = config.cachePath || 默认路径
  ↓
express.static(uploadsDir)
fileUpload({ tempFileDir: uploadsDir/tmp })
initCachePath(uploadsDir)  ← 确保目录存在
  ↓
服务就绪
```

### 3.2 修改缓存目录流程

```
用户在设置中输入新路径 /Users/xxx/MyCache
  ↓
前端 POST /setCachePath { path, migrate: true }
  ↓
后端校验:
  - 绝对路径?(path.isAbsolute)
  - 不等于当前路径?
  - 不是应用根目录?(避免污染应用文件)
  - 不存在则创建(mkdirSync recursive)
  - 可写性测试(写临时文件再删)
  ↓
migrate=true 且旧目录有内容:
  - fs.cpSync(oldDir, newDir, { recursive: true })
  - 失败则清理已复制内容,回滚,不更新配置
  ↓
setCachePath(newPath) → 写入 config.json (原子写:临时文件 + renameSync)
  ↓
返回 { code: 0, data: { newPath, needsRestart: true } }
  ↓
前端提示「缓存目录已更新,重启应用后生效」
```

## 四、服务端改动

### 4.1 新增配置管理模块 `server/config.js`

集中管理用户配置(单一职责,后续可扩展其他配置项):

```javascript
const fs = require('fs');
const path = require('path');
const { getAppWritableRoot } = require('./tool.js');

const CONFIG_FILE = path.join(getAppWritableRoot(), 'config.json');
const DEFAULT_CONFIG = { cachePath: null };  // null = 使用默认目录

// 读取 config.json,容错合并默认值
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    }
  } catch (e) {
    console.error('[Config] load failed:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

// 原子写入(临时文件 + renameSync,防止中途崩溃导致配置损坏)
function saveConfig(cfg) {
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_FILE);
}

// 默认缓存路径
function getDefaultCachePath() {
  return path.join(getAppWritableRoot(), 'uploads');
}

// 返回最终生效路径:cfg.cachePath 存在且可写则用之,否则回退默认
function getCachePath() {
  const cfg = loadConfig();
  if (cfg.cachePath && fs.existsSync(cfg.cachePath)) {
    return cfg.cachePath;
  }
  return getDefaultCachePath();
}

// 保存自定义缓存路径
function setCachePath(p) {
  const cfg = loadConfig();
  cfg.cachePath = p;
  saveConfig(cfg);
}

module.exports = {
  loadConfig,
  saveConfig,
  getCachePath,
  setCachePath,
  getDefaultCachePath,
  CONFIG_FILE,
  DEFAULT_CONFIG
};
```

### 4.2 改造 `server/app.js`

启动时用 `getCachePath()` 替代硬编码:

```javascript
// 变更前
const uploadsDir = path.join(getAppWritableRoot(), 'uploads');

// 变更后
const { getCachePath } = require('./config.js');
const uploadsDir = getCachePath();
```

其余逻辑(`express.static`、`fileUpload`、`/uploadFile`、`initCachePath`、传给路由)无需改动,变量名 `uploadsDir` 保持不变。

注册新路由:

```javascript
function registerRoutes() {
  require('./routes/getHomeDir.js')(app, uploadsDir);
  require('./routes/openCachePath.js')(app, uploadsDir);
  require('./routes/setCachePath.js')(app);  // ← 新增
  // ... 其余路由不变
}
```

### 4.3 新增路由 `server/routes/setCachePath.js`

`POST /setCachePath`,请求体 `{ path: string, migrate?: boolean }`:

| 步骤 | 校验/动作 | 失败处理 |
|------|----------|----------|
| 1 | `path.isAbsolute()` 拒绝相对路径 | 返回「请输入绝对路径」 |
| 2 | `path.resolve()` 规范化 | - |
| 3 | 不等于当前 `uploadsDir` | 返回「新路径与当前路径相同」 |
| 4 | 不等于 `getAppWritableRoot()`(避免污染应用根目录) | 返回「不能使用应用根目录」 |
| 5 | 不存在则 `fs.mkdirSync(p, { recursive: true })` | 创建失败返回错误 |
| 6 | 写 `.chattransfer-write-test` 临时文件再删,验证可写 | 返回「路径无效或不可写」 |
| 7 | `migrate=true` 且旧目录存在 → `fs.cpSync(oldDir, newDir, { recursive: true })` | 复制失败清理已复制内容,回滚,返回错误 |
| 8 | `setCachePath(p)` 原子写入 `config.json` | 写入失败返回错误 |
| 9 | 返回 `{ code: 0, data: { newPath: p, needsRestart: true } }` | - |

### 4.4 扩展 `server/routes/getHomeDir.js`

`/getHomeDir` 返回值新增字段(前端用于显示「默认值」「是否已自定义」):

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "uploadsDir": "/Users/xxx/MyCache",
    "defaultDir": "/path/to/app/uploads",
    "isCustomized": true,
    "configFile": "/path/to/app/config.json"
  }
}
```

## 五、前端改动

### 5.1 设置抽屉新增「修改缓存目录」按钮

```
┌─ 设置 ─────────────────────────────┐
│ 语言: [跟随系统 ▼]                 │
│ ──────────────────────────────────  │
│ 我的昵称: [小明      ] ✏️          │
│ 群名称:   [内部测试群] ✏️          │
│ ──────────────────────────────────  │
│ 常用功能                            │
│   📷 二维码                          │
│   📋 复制缓存路径                    │
│   📂 打开缓存目录                    │
│   📂 修改缓存目录   ← 新增           │
│   📄 版本更新记录                    │
│   💬 问题反馈                        │
│   🗑️ 清空聊天记录                    │
│ ──────────────────────────────────  │
│ 当前缓存路径:                       │
│ /Users/xxx/MyCache                  │
│ (自定义)             ← 新增标识     │
└─────────────────────────────────────┘
```

### 5.2 修改缓存目录对话框

```
┌─ 设置缓存目录 ───────────────────────┐
│                                    │
│ 缓存目录:                          │
│ [/Users/xxx/MyCache         ] [使用默认] │
│                                    │
│ ☑ 迁移已有文件                     │
│                                    │
│           [取消]  [确定]            │
└────────────────────────────────────┘
```

要点:
- `el-input` 输入路径,「使用默认」按钮一键填入 `defaultDir`
- 「迁移已有文件」复选框默认勾选
- 确定后调用 `POST /setCachePath`
- 成功后 `ElMessageBox` 提示「缓存目录已更新,重启应用后生效」,由用户手动重启

### 5.3 ChatLayout.vue 改动点

| 位置 | 改动 |
|------|------|
| `cache-info` 区域(`265-268` 行) | 新增「自定义」标识(当 `isCustomized=true` 时) |
| `tools-list` 区域(`226-263` 行) | 新增「修改缓存目录」tool-item |
| 新增对话框 | 「设置缓存目录」dialog |
| `fetchCachePath`(`1400` 行) | 读取新增字段 `defaultDir`、`isCustomized` |
| 新增 `handleChangeCachePath` | 调 `/setCachePath`,处理响应与提示 |

## 六、API 设计

### 6.1 `POST /setCachePath`

**请求:**
```json
{
  "path": "/Users/xxx/MyCache",
  "migrate": true
}
```

**响应(成功):**
```json
{
  "code": 0,
  "message": "缓存目录设置成功",
  "data": {
    "newPath": "/Users/xxx/MyCache",
    "needsRestart": true
  }
}
```

**响应(失败):**
```json
{
  "code": -1,
  "message": "路径无效或不可写"
}
```

### 6.2 `GET /getHomeDir`(扩展)

**响应:**
```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "uploadsDir": "/Users/xxx/MyCache",
    "defaultDir": "/path/to/app/uploads",
    "isCustomized": true,
    "configFile": "/path/to/app/config.json"
  }
}
```

## 七、i18n 新增词条

### zh-CN.json 新增

```json
{
  "tools": {
    "changeCachePath": "修改缓存目录",
    "changeCachePathTitle": "设置缓存目录",
    "cachePathInputPlaceholder": "请输入绝对路径",
    "useDefaultCachePath": "使用默认",
    "migrateFiles": "迁移已有文件",
    "cachePathCustomized": "(自定义)",
    "cachePathUpdated": "缓存目录已更新,重启应用后生效",
    "cachePathInvalid": "路径无效或不可写",
    "cachePathSameAsCurrent": "新路径与当前路径相同",
    "relativePathNotAllowed": "请输入绝对路径",
    "appRootNotAllowed": "不能使用应用根目录作为缓存目录"
  }
}
```

### en.json 新增

```json
{
  "tools": {
    "changeCachePath": "Change cache folder",
    "changeCachePathTitle": "Set cache folder",
    "cachePathInputPlaceholder": "Enter an absolute path",
    "useDefaultCachePath": "Use default",
    "migrateFiles": "Migrate existing files",
    "cachePathCustomized": "(custom)",
    "cachePathUpdated": "Cache folder updated. Restart the app to apply.",
    "cachePathInvalid": "Path is invalid or not writable",
    "cachePathSameAsCurrent": "New path is the same as current",
    "relativePathNotAllowed": "Please enter an absolute path",
    "appRootNotAllowed": "Cannot use app root as cache folder"
  }
}
```

## 八、文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `server/config.js` | 新增 | 配置管理模块(loadConfig / saveConfig / getCachePath / setCachePath) |
| `server/routes/setCachePath.js` | 新增 | 设置缓存目录接口(校验/迁移/持久化) |
| `server/app.js` | 修改 | 启动时用 `getCachePath()` 替代硬编码;注册新路由 |
| `server/routes/getHomeDir.js` | 修改 | 返回 `defaultDir`、`isCustomized`、`configFile` |
| `frontend/src/components/ChatLayout.vue` | 修改 | 新增「修改缓存目录」按钮、对话框、交互逻辑 |
| `frontend/vite.config.js` | 修改 | 新增 `/setCachePath` 代理 |
| `frontend/src/i18n/locales/zh-CN.json` | 修改 | 新增中文词条 |
| `frontend/src/i18n/locales/en.json` | 修改 | 新增英文词条 |
| `frontend/src/data/changelog.js` | 修改 | 新增版本日志条目 |

**预计工作量:** 9 个文件,新增 2 个文件,核心代码约 250 行新增/修改。**不引入任何新的 npm 依赖。**

## 九、边界情况处理

| 场景 | 处理方式 |
|------|----------|
| 输入相对路径 | 拒绝,提示「请输入绝对路径」 |
| 新路径与当前路径相同 | 拒绝,提示「新路径与当前路径相同」 |
| 新路径是应用根目录 | 拒绝,提示「不能使用应用根目录作为缓存目录」 |
| 目标目录不存在 | 自动 `mkdirSync(p, { recursive: true })` 创建 |
| 目标目录不可写 | 写临时文件测试,失败则拒绝 |
| 迁移过程中失败 | 清理已复制内容,不更新配置,返回错误 |
| `config.json` 损坏 | `loadConfig` 容错,回退默认配置 |
| `config.json` 写入中途崩溃 | 原子写(临时文件 + renameSync)避免损坏 |
| 旧目录残留 | 不自动删除,由用户自行清理(避免数据丢失) |
| pkg 与 dev 环境差异 | `getAppWritableRoot()` 已兼容两环境,`config.json` 与默认 `uploads` 都基于此 |
| 升级新版本 | `config.json` 保留,新版本读取后自动应用自定义路径 |

## 十、关键决策点

1. **生效方式**:修改后**需重启进程**才生效。不实现自动重启,提示用户手动重启。
2. **文件迁移**:切换路径时提供「迁移已有文件」选项,默认勾选,递归复制旧目录内容到新目录;旧目录保留不自动删除。
3. **配置文件位置**:`config.json` 放在 `getAppWritableRoot()` 下(pkg 环境即 exe 同级目录;开发环境即项目根目录)。
4. **路径输入方式**:仅支持手动输入绝对路径(浏览器无法可靠地获取本地真实目录路径)。
5. **不引入新依赖**:全部用 Node 内置模块(`fs`、`path`)。

## 十一、默认目录行为(确认)

| 场景 | `config.json` 状态 | 生效路径 |
|------|---------------------|----------|
| 用户从未设置过 | 文件不存在 / `cachePath` 为 `null` | 默认路径 `getAppWritableRoot()/uploads` |
| 用户设置过且目录存在 | `cachePath` 为自定义值 | 用户自定义路径 |
| 用户设置过但目录被删除/不可访问 | `cachePath` 存在但 `fs.existsSync` 为 `false` | 回退默认路径(保证至少有可用目录) |
| 用户点击「使用默认」并保存 | `cachePath` 设为默认路径字符串 | 默认路径(`isCustomized` 仍为 `false`) |

实现核心:`server/config.js` 的 `getCachePath()`:
```js
function getCachePath() {
  const cfg = loadConfig();
  // 用户设置过且目录存在才用自定义,否则回退默认,保证至少有可用目录
  if (cfg.cachePath && fs.existsSync(cfg.cachePath)) {
    return cfg.cachePath;
  }
  return getDefaultCachePath();
}
```

「是否已自定义」判断逻辑:`isCustomized = cfg.cachePath && cfg.cachePath !== defaultDir`。

## 十二、回测范围

本次改动影响缓存目录的来源,需回测以下功能在「默认目录」与「自定义目录」两种场景下均正常:

### 12.1 启动与初始化

| 测试项 | 验证点 |
|--------|--------|
| 首次启动(无 config.json) | 自动使用默认路径,启动日志 `CacheDir` 显示 `xxx/uploads` |
| 有自定义 config.json 启动 | 启动日志 `CacheDir` 显示自定义路径 |
| config.json 损坏 | 回退默认路径,不崩溃,启动正常 |
| config.json 中路径不存在 | 回退默认路径,启动正常 |
| pkg 环境 | `config.json` 与默认 `uploads` 都在 exe 同级目录 |
| dev 环境 | `config.json` 与默认 `uploads` 都在项目根目录 |

### 12.2 文件上传与访问(`/uploadFile`)

| 测试项 | 验证点 |
|--------|--------|
| 上传单文件 | 保存到当前生效目录的 `files/` 子目录 |
| 上传多文件(批量) | 全部保存到当前生效目录 |
| 上传后通过 URL 访问 | `express.static` 正确托管新目录下文件 |
| 临时文件 | `uploadsDir/tmp/` 在新目录下创建 |

### 12.3 缓存路径相关接口

| 测试项 | 验证点 |
|--------|--------|
| `GET /getHomeDir` | 返回 `uploadsDir`/`defaultDir`/`isCustomized`/`configFile` 四个字段 |
| `POST /openCachePath` | 打开当前生效目录(非旧目录) |
| `POST /setCachePath`(合法路径) | 返回 `needsRestart: true`,`config.json` 更新 |
| `POST /setCachePath`(相对路径) | 返回「请输入绝对路径」 |
| `POST /setCachePath`(与当前相同) | 返回「新路径与当前路径相同」 |
| `POST /setCachePath`(应用根目录) | 返回「不能使用应用根目录」 |
| `POST /setCachePath`(不可写路径) | 返回「路径无效或不可写」 |
| `POST /setCachePath`(不存在路径) | 自动创建后成功 |
| `POST /setCachePath`(migrate=true) | 旧目录文件复制到新目录 |
| `POST /setCachePath`(migrate 失败) | 回滚,配置不更新,返回错误 |

### 12.4 前端交互

| 测试项 | 验证点 |
|--------|--------|
| 设置抽屉显示缓存路径 | 正确显示当前生效路径 |
| 自定义路径时显示「(自定义)」标识 | `isCustomized=true` 时显示 |
| 「复制缓存路径」按钮 | 复制当前生效路径 |
| 「打开缓存目录」按钮 | 打开当前生效目录 |
| 「修改缓存目录」按钮 | 弹出对话框 |
| 「使用默认」按钮 | 一键填入 `defaultDir` |
| 「迁移已有文件」复选框 | 默认勾选 |
| 设置成功提示 | 显示「重启应用后生效」 |
| 代理转发 | `/setCachePath` 在 dev 环境经 vite 代理可达后端 |

### 12.5 不受影响的功能(快速回归)

以下功能不依赖 `uploadsDir` 的来源,做简单冒烟即可:
- Socket.IO 实时通信(私聊/群聊)
- 昵称/群名修改与同步
- Pin/置顶消息
- 聊天记录(localStorage)
- 二维码生成与扫码登录
- 版本信息接口 `/getVersionInfo`
- 数据统计上报 `/api/track`

## 十三、验收标准

- [ ] 设置抽屉显示「修改缓存目录」按钮
- [ ] 当前缓存路径下方显示「(自定义)」标识(当使用自定义路径时)
- [ ] 点击「修改缓存目录」弹出对话框,可输入路径
- [ ] 「使用默认」按钮可一键填入默认路径
- [ ] 「迁移已有文件」复选框默认勾选
- [ ] 输入相对路径时拒绝并提示
- [ ] 输入与当前相同路径时拒绝并提示
- [ ] 输入应用根目录时拒绝并提示
- [ ] 目标目录不存在时自动创建
- [ ] 目标目录不可写时拒绝并提示
- [ ] 勾选迁移时,旧目录文件复制到新目录
- [ ] 迁移失败时回滚,不更新配置
- [ ] 设置成功后提示「重启应用后生效」
- [ ] 重启后 `CacheDir` 日志显示新路径
- [ ] 重启后上传文件保存到新路径
- [ ] 重启后「打开缓存目录」打开新路径
- [ ] `config.json` 正确持久化自定义路径
- [ ] `config.json` 损坏时回退默认路径,不崩溃
- [ ] 中英文 i18n 完整
- [ ] changelog 更新
