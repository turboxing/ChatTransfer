export function useMessageEmitter({ socket, isConnected, targetUser, rawMessages, saveMessage }) {
  const emitMessage = (messageData) => {
    const eventName = targetUser.value === 'group_chat' ? 'group_chat' : 'private_chat'

    if (socket.value && isConnected.value) {
      socket.value.emit(eventName, messageData, (data) => {
        const index = rawMessages.value.findIndex((message) => message.msgId === messageData.msgId)
        if (index !== -1) {
          rawMessages.value[index] = { ...data, status: 'success' }
          saveMessage(rawMessages.value[index])
        }
      })
      return
    }

    const index = rawMessages.value.findIndex((message) => message.msgId === messageData.msgId)
    if (index !== -1) rawMessages.value[index].status = 'failed'
  }

  return { emitMessage }
}
