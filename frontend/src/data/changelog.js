export const changelog = [
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
