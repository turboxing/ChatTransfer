import { computed, ref } from 'vue'

const PIN_STORAGE_KEY = 'im_chat_pin'
const TOP_STORAGE_KEY = 'im_chat_top'

function truncateContent(content) {
  return content && content.length > 30 ? `${content.substring(0, 30)}...` : content
}

export function useMessagePin({ t, parseFileName }) {
  const pinDrawerVisible = ref(false)
  const pinFilter = ref('all')
  const pinnedMessages = ref([])
  const topMessage = ref(null)

  const load = () => {
    try {
      const data = localStorage.getItem(PIN_STORAGE_KEY)
      pinnedMessages.value = data ? JSON.parse(data) : []
    } catch {
      pinnedMessages.value = []
    }

    try {
      const data = localStorage.getItem(TOP_STORAGE_KEY)
      topMessage.value = data ? JSON.parse(data) : null
    } catch {
      topMessage.value = null
    }
  }

  const savePinnedMessages = () => {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedMessages.value))
  }

  const saveTopMessage = () => {
    if (topMessage.value) {
      localStorage.setItem(TOP_STORAGE_KEY, JSON.stringify(topMessage.value))
    } else {
      localStorage.removeItem(TOP_STORAGE_KEY)
    }
  }

  const isMessagePinned = (msgId) => pinnedMessages.value.some((message) => message.msgId === msgId)
  const isMessageTopped = (msgId) => !!topMessage.value && topMessage.value.msgId === msgId

  const getLatestPinnedMessage = () => {
    if (pinnedMessages.value.length === 0) return ''
    const latest = pinnedMessages.value.at(-1)
    const content = truncateContent(latest.text || latest.msg || '')
    return `${latest.sender}: ${content}`
  }

  const getTopMessageContent = () => {
    if (!topMessage.value) return ''
    const content = truncateContent(topMessage.value.text || topMessage.value.msg || '')
    return `${topMessage.value.sender}: ${content}`
  }

  const filteredPinnedMessages = computed(() => {
    if (pinFilter.value === 'all') return pinnedMessages.value

    return pinnedMessages.value.filter((message) => {
      if (pinFilter.value === 'text') return message.msgType === 'TEXT'
      if (pinFilter.value === 'image') return message.msgType === 'IMAGE'
      if (pinFilter.value === 'file') return message.msgType === 'FILE'
      if (pinFilter.value === 'link') {
        const text = message.text || message.msg || ''
        return text.includes('http')
      }
      return true
    })
  })

  const pinnedBubbleItems = computed(() => (
    filteredPinnedMessages.value.map((message) => ({
      key: message.msgId,
      content: message.text || message.msg || (message.msgType === 'FILE' ? t('chat.fileTag') : ''),
      time: message.time || message.createTime,
      rawType: message.msgType,
      fileUrl: message.fileUrl,
      fileName: message.fileName || parseFileName(message.fileUrl),
      fileSize: message.fileSize,
      status: 'success',
      originalMsg: message,
      noStyle: true
    }))
  ))

  const toggleMessagePin = (item) => {
    const existingIndex = pinnedMessages.value.findIndex((message) => message.msgId === item.key)

    if (existingIndex >= 0) {
      pinnedMessages.value.splice(existingIndex, 1)
      ElMessage.success(t('chat.cancelPin'))
    } else {
      const now = new Date()
      const pinTime = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('-') + ' ' + [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0')
      ].join(':')

      pinnedMessages.value.push({ ...item.originalMsg, pinTime })
      ElMessage.success(t('chat.setPin'))
    }

    savePinnedMessages()
  }

  const unpinMessage = (msgId) => {
    const index = pinnedMessages.value.findIndex((message) => message.msgId === msgId)
    if (index >= 0) {
      pinnedMessages.value.splice(index, 1)
      savePinnedMessages()
      ElMessage.success(t('chat.cancelPin'))
    }
  }

  const unpinLatestMessage = () => {
    if (pinnedMessages.value.length > 0) {
      pinnedMessages.value.pop()
      savePinnedMessages()
      ElMessage.success(t('chat.cancelPin'))
    }
  }

  const handleTopMessage = (item) => {
    if (isMessageTopped(item.key)) {
      topMessage.value = null
      ElMessage.success(t('chat.cancelTop'))
    } else {
      topMessage.value = item.originalMsg
      ElMessage.success(t('chat.setTop'))
    }
    saveTopMessage()
  }

  const unTopMessage = () => {
    topMessage.value = null
    saveTopMessage()
    ElMessage.success(t('chat.cancelTop'))
  }

  load()

  return {
    pinDrawerVisible,
    pinFilter,
    pinnedMessages,
    topMessage,
    filteredPinnedMessages,
    pinnedBubbleItems,
    isMessagePinned,
    isMessageTopped,
    getLatestPinnedMessage,
    getTopMessageContent,
    toggleMessagePin,
    unpinMessage,
    unpinLatestMessage,
    handleTopMessage,
    unTopMessage
  }
}
