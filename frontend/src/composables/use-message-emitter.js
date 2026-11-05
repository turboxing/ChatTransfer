export function useMessageEmitter({ socket, isConnected, targetUser, rawMessages, saveMessage }) {
  const emitMessage = (messageData) => {
    const eventName = 'room_chat'
    const roomMessageData = {
      ...messageData,
      roomId: targetUser.value,
      receiver: targetUser.value
    }

    if (socket.value && isConnected.value) {
      socket.value.emit(eventName, roomMessageData, (data) => {
        const index = rawMessages.value.findIndex((message) => message.msgId === roomMessageData.msgId)
        if (index !== -1) {
          rawMessages.value[index] = {
            ...data,
            status: data.status === 'failed' ? 'failed' : 'success'
          }
          saveMessage(rawMessages.value[index])
        }
      })
      return
    }

    const index = rawMessages.value.findIndex((message) => message.msgId === roomMessageData.msgId)
    if (index !== -1) rawMessages.value[index].status = 'failed'
  }

  return { emitMessage }
}
