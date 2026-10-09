import {
  GROUPNAME_STORAGE_KEY,
  NICKNAME_STORAGE_KEY
} from './use-identity-editor'

export function useChatSession({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  loadHistory,
  connectSocket,
  fetchVersionInfo
}) {
  const initSession = () => {
    const urlParams = new URLSearchParams(window.location.search)
    currentUser.value = urlParams.get('sender') || 'UserA'
    targetUser.value = urlParams.get('receiver') || 'UserB'

    const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY)
    myNickname.value = urlParams.get('nickname') || savedNickname || ''
    groupName.value = localStorage.getItem(GROUPNAME_STORAGE_KEY) || ''

    loadHistory()
    connectSocket()
    fetchVersionInfo()
  }

  return { initSession }
}
