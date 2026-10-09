import { computed } from 'vue'

export function useMessageDisplay({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  onlineUsers,
  rawMessages,
  isMessagePinned,
  parseFileName,
  t
}) {
  const onlineCount = computed(() => (
    onlineUsers.value.filter((user) => user.status === 'ONLINE').length
  ))

  const displayGroupName = computed(() => (
    groupName.value || t('chat.defaultGroupName')
  ))

  const getDisplayName = (message) => {
    if (!message) return ''
    if (message.sender === currentUser.value) {
      return myNickname.value || message.sender_nickname || message.sender?.slice(-5) || ''
    }
    if (message.sender_nickname) return message.sender_nickname

    const user = onlineUsers.value.find((onlineUser) => onlineUser.sender === message.sender)
    if (user?.nickname) return user.nickname
    return message.sender?.slice(-5) || ''
  }

  const getDisplayIp = (message) => {
    if (!message) return ''
    if (message.sender_ip) return message.sender_ip

    const user = onlineUsers.value.find((onlineUser) => onlineUser.sender === message.sender)
    return user?.ip || ''
  }

  const bubbleItems = computed(() => (
    rawMessages.value.map((message) => {
      const isSelf = message.sender === currentUser.value
      const isGroupChat = targetUser.value === 'group_chat'

      return {
        key: message.msgId,
        role: isSelf ? 'user' : 'ai',
        placement: isSelf ? 'end' : 'start',
        content: message.text || message.msg || (message.msgType === 'FILE' ? t('chat.fileTag') : ''),
        time: message.time || message.createTime,
        rawType: message.msgType,
        fileUrl: message.fileUrl,
        fileName: message.fileName || parseFileName(message.fileUrl),
        fileSize: message.fileSize,
        status: message.status || 'success',
        originalMsg: message,
        noStyle: true,
        isPinned: isMessagePinned(message.msgId),
        isGroupChat
      }
    })
  ))

  return {
    onlineCount,
    displayGroupName,
    getDisplayName,
    getDisplayIp,
    bubbleItems
  }
}
