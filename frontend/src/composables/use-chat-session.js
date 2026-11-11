import { NICKNAME_STORAGE_KEY } from './use-identity-editor'
import { useUserId } from './use-user-identity'

export function useChatSession({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  pendingRoomCode,
  loadHistory,
  connectSocket,
  fetchVersionInfo,
  getUserId = null
}) {
  const initSession = () => {
    const urlParams = new URLSearchParams(window.location.search)
    currentUser.value = urlParams.get('sender') || (getUserId ? getUserId() : useUserId().getUserId())
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
