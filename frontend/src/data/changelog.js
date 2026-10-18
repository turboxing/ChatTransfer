export const changelog = [
  {
    version: '2.0.10',
    date: '2026-10-18',
    changes: {
      'zh-CN': [
        '新增 npm 分发方式：支持 npx chattransfer 和 npm install -g chattransfer',
        '新增 CLI 参数：--host、--port、--data-dir、--public-url、--no-browser、--version、--help',
        '新增 npm 自动发布流程，发布前自动测试、构建前端并校验包内容',
        '优化 npm 运行时数据目录，配置、上传文件和 SQLite 数据不再写入全局包目录',
        '修复 Linux 无桌面环境启动兼容性，并支持通过 xdg-open 打开浏览器和缓存目录'
      ],
      en: [
        'Added npm distribution with npx chattransfer and npm install -g chattransfer',
        'Added CLI options: --host, --port, --data-dir, --public-url, --no-browser, --version, and --help',
        'Added an automated npm publication workflow that tests, builds the frontend, and verifies package contents before publishing',
        'Improved npm runtime data directories so configuration, uploads, and SQLite data are no longer written to the global package directory',
        'Fixed headless Linux startup compatibility and enabled xdg-open support for browsers and cache folders'
      ]
    }
  },
  {
    version: '2.0.9.3',
    date: '2026-10-11',
    changes: {
      'zh-CN': [
        '新增服务端 SQLite 聊天历史：群聊和私聊消息落盘，新设备与离线设备上线后可同步历史',
        '新增历史消息游标增量同步与消息去重，修复历史文本气泡空白问题',
        '新增「清空我的本地记录」和「清空服务器会话历史」，后者会删除会话消息及关联文件',
        '优化发布流程：SQLite 原生模块随包发布，并在 macOS/Windows 原生环境打包'
      ],
      en: [
        'Added server-side SQLite chat history: group and private messages are persisted, so new and offline devices can sync history after coming online',
        'Added cursor-based incremental history sync and message deduplication, and fixed blank text bubbles for restored messages',
        'Added "Clear my local history" and "Clear server conversation history"; the latter removes conversation messages and related files',
        'Improved release packaging: the SQLite native module is bundled and packages are built on native macOS/Windows runners'
      ]
    }
  },
  {
    version: '2.0.9.2',
    date: "2026-10-09",
    changes: {
      "zh-CN": [
        "开源源码仓库，新增三语 README、MIT License、贡献指南和开发文档",
        "修复 CI 测试依赖安装顺序，确保测试先安装前端依赖"
      ],
      en: [
        "Open-source source repository with trilingual README, MIT License, contribution guide, and development docs",
        "Fix CI dependency installation order so frontend dependencies are installed before tests"
      ]
    }
  },
  {
    version: '2.0.9.1',
    date: '2026-08-25',
    changes: {
      'zh-CN': [
        '新增自定义缓存目录：可在设置中修改缓存（上传文件）目录，支持迁移已有文件，重启后生效',
        '缓存路径区域显示「自定义」标识，区分默认与自定义路径'
      ],
      en: [
        'Added custom cache folder: change the cache (uploads) folder in Settings, with optional file migration, applied after restart',
        'Cache path now shows a "(custom)" tag to distinguish custom paths from the default'
      ]
    }
  },
  {
    version: '2.0.9.0',
    date: '2026-08-08',
    changes: {
      'zh-CN': [
        '新增自定义昵称功能：登录时可输入昵称，聊天中可随时修改，所有端实时同步',
        '新增自定义群名称功能：任意成员可修改群名称，所有端实时同步',
        '新增用户 IP 显示：每条消息发送者昵称下方显示其局域网 IP 地址',
        '新增在线人数显示：聊天头部显示当前在线人数',
        '优化登录流程：支持昵称缓存，下次进入自动填充'
      ],
      en: [
        'Added custom nickname: enter a nickname at login, changeable anytime, synced across all clients in real time',
        'Added custom group name: any member can rename the group, synced across all clients in real time',
        'Added user IP display: each message shows the sender\'s LAN IP address below their nickname',
        'Added online count: the chat header shows the current number of online users',
        'Improved login flow: nickname is cached and auto-filled on next visit'
      ]
    }
  },
  {
    version: '2.0.8.9',
    date: '2026-06-16',
    changes: {
      'zh-CN': [
        '新增问题反馈功能：在首页底部和常用功能侧边栏新增问题反馈入口，点击可直接跳转到 GitHub Issue 页面',
        '优化用户反馈渠道：方便用户提交问题和建议，帮助持续改进产品'
      ],
      en: [
        'Added feedback feature: new feedback entry at the bottom of home page and in the common features sidebar, click to jump directly to GitHub Issue page',
        'Optimized user feedback channel: convenient for users to submit issues and suggestions, helping to continuously improve the product'
      ]
    }
  },
  {
    version: '2.0.8.8',
    date: '2026-05-24',
    changes: {
      'zh-CN': [
        '新增端口占用自动重试：端口被占用时自动 +1，最多尝试 3 次',
        '新增 Pin 消息功能，支持将重要消息固定在顶部',
        '新增批量文件拖拽上传功能',
        '优化消息气泡展示效果',
        '修复部分已知问题'
      ],
      en: [
        'Added automatic port retry when the default port is in use (increment by 1, up to 3 attempts)',
        'Added Pin message feature to keep important messages at the top',
        'Added batch drag-and-drop file upload',
        'Optimized message bubble display',
        'Fixed known issues'
      ]
    }
  }
]
