import { NICKNAME_STORAGE_KEY } from './use-identity-editor'

export function useChatSession({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  pendingRoomCode,
  loadHistory,
  connectSocket,
  fetchVersionInfo
}) {
  const initSession = () => {
    const urlParams = new URLSearchParams(window.location.search)
    currentUser.value = urlParams.get('sender') || 'UserA'
    targetUser.value = urlParams.get('roomId') || urlParams.get('receiver') || 'group_chat'
    pendingRoomCode.value = urlParams.get('code') || null

    const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY)
    myNickname.value = urlParams.get('nickname') || savedNickname || ''
    groupName.value = urlParams.get('roomName') || ''

    loadHistory()
    connectSocket()
    fetchVersionInfo()
  }

  return { initSession }
}
