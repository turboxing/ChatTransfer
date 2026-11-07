import { computed, ref } from 'vue'

const PIN_STORAGE_KEY = 'im_chat_pin'
const TOP_STORAGE_KEY = 'im_chat_top'

function truncateContent(content) {
  return content && content.length > 30 ? `${content.substring(0, 30)}...` : content
}

export function useMessagePin({ targetUser, t, parseFileName }) {
  const pinDrawerVisible = ref(false)
  const pinFilter = ref('all')
  const pinnedMessages = ref([])
  const storedTopMessage = ref(null)

  const load = () => {
    try {
      const data = localStorage.getItem(PIN_STORAGE_KEY)
      pinnedMessages.value = data ? JSON.parse(data) : []
    } catch {
      pinnedMessages.value = []
    }

    try {
      const data = localStorage.getItem(TOP_STORAGE_KEY)
      storedTopMessage.value = data ? JSON.parse(data) : null
    } catch {
      topMessage.value = null
    }
  }

  const savePinnedMessages = () => {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedMessages.value))
  }

  const saveTopMessage = () => {
    if (storedTopMessage.value) {
      localStorage.setItem(TOP_STORAGE_KEY, JSON.stringify(storedTopMessage.value))
    } else {
      localStorage.removeItem(TOP_STORAGE_KEY)
    }
  }

  const roomPinnedMessages = computed(() => (
    pinnedMessages.value.filter((message) => message.receiver === targetUser.value)
  ))

  const activeTopMessage = computed(() => (
    storedTopMessage.value?.receiver === targetUser.value ? storedTopMessage.value : null
  ))

  const isMessagePinned = (msgId) => roomPinnedMessages.value.some((message) => message.msgId === msgId)
  const isMessageTopped = (msgId) => !!activeTopMessage.value && activeTopMessage.value.msgId === msgId

  const getLatestPinnedMessage = () => {
    if (roomPinnedMessages.value.length === 0) return ''
    const latest = roomPinnedMessages.value.at(-1)
    const content = truncateContent(latest.text || latest.msg || '')
    return `${latest.sender}: ${content}`
  }

  const getTopMessageContent = () => {
    if (!activeTopMessage.value) return ''
    const content = truncateContent(activeTopMessage.value.text || activeTopMessage.value.msg || '')
    return `${activeTopMessage.value.sender}: ${content}`
  }

  const filteredPinnedMessages = computed(() => {
    if (pinFilter.value === 'all') return roomPinnedMessages.value

    return roomPinnedMessages.value.filter((message) => {
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
      storedTopMessage.value = null
      ElMessage.success(t('chat.cancelTop'))
    } else {
      storedTopMessage.value = item.originalMsg
      ElMessage.success(t('chat.setTop'))
    }
    saveTopMessage()
  }

  const unTopMessage = () => {
    storedTopMessage.value = null
    saveTopMessage()
    ElMessage.success(t('chat.cancelTop'))
  }

  const clearRoomState = (roomId) => {
    if (!roomId) return;

    const nextPinned = pinnedMessages.value.filter(
      (message) => message.receiver !== roomId
    );
    if (nextPinned.length !== pinnedMessages.value.length) {
      pinnedMessages.value = nextPinned;
      savePinnedMessages();
    }

    if (storedTopMessage.value?.receiver === roomId) {
      storedTopMessage.value = null;
      saveTopMessage();
    }
  }

  load()

  return {
    pinDrawerVisible,
    pinFilter,
    pinnedMessages,
    topMessage: activeTopMessage,
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
    unTopMessage,
    clearRoomState
  }
}
