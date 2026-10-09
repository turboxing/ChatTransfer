export const isAttachmentMessage = (item) => (
  item?.rawType === 'FILE' || item?.rawType === 'IMAGE'
)

export const hasMessageMobileActions = (item) => (
  (isAttachmentMessage(item) && item?.status === 'success') ||
  item?.role === 'user'
)

export function useMessageActions({
  currentUser,
  targetUser,
  inputValue,
  rawMessages,
  emitMessage,
  scrollToBottom,
  addSendHistory,
  uploadFile,
  t,
  notify
}) {
  const handleSend = (content) => {
    if (!content || !content.trim()) return

    const messageData = {
      msgId: Date.now().toString(),
      sender: currentUser.value,
      receiver: targetUser.value,
      text: content,
      msgType: 'TEXT',
      time: new Date().toLocaleString(),
      status: 'sending',
      visitorId: window.chat_visitor_id
    }

    rawMessages.value.push(messageData)
    scrollToBottom()
    emitMessage(messageData)
    inputValue.value = ''
    addSendHistory(content.trim())
  }

  const handleRetry = (item) => {
    const message = item.originalMsg
    const index = rawMessages.value.findIndex((currentMessage) => currentMessage === message)
    if (index !== -1) rawMessages.value.splice(index, 1)

    if (message.msgType === 'FILE' || message.msgType === 'IMAGE') {
      if (message.fileUrl) {
        const messageData = {
          ...message,
          msgId: Date.now().toString(),
          time: new Date().toLocaleString(),
          status: 'sending'
        }
        rawMessages.value.push(messageData)
        scrollToBottom()
        emitMessage(messageData)
      } else if (message.rawFile) {
        uploadFile(message.rawFile)
      } else {
        notify?.error(t('chat.retryUploadFailed'))
      }
      return
    }

    handleSend(message.text || message.content)
  }

  const handleOpen = (item) => {
    if (item.fileUrl) window.open(item.fileUrl, '_blank')
  }

  const handleDownload = (item) => {
    if (!item.fileUrl) return

    const link = document.createElement('a')
    link.href = item.fileUrl
    link.download = item.fileName || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return { handleSend, handleRetry, handleOpen, handleDownload }
}
