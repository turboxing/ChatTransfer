import { ref } from 'vue'

export const NICKNAME_STORAGE_KEY = 'im_chat_nickname'
export const GROUPNAME_STORAGE_KEY = 'im_chat_group_name'

export function useIdentityEditor({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  socket,
  isConnected,
  t,
  notify
}) {
  const editDialogVisible = ref(false)
  const editDialogTitle = ref('')
  const editDialogPlaceholder = ref('')
  const editDialogType = ref('')
  const editInputRef = ref(null)

  const openNicknameEditor = () => {
    editDialogType.value = 'nickname'
    editDialogTitle.value = t('chat.editNickname')
    editDialogPlaceholder.value = t('chat.nicknamePlaceholder')
    editDialogVisible.value = true
    editInputRef.value?.setValue(myNickname.value)
  }

  const openGroupNameEditor = () => {
    if (targetUser.value !== 'group_chat') return
    editDialogType.value = 'groupName'
    editDialogTitle.value = t('chat.editGroupName')
    editDialogPlaceholder.value = t('chat.groupNamePlaceholder')
    editDialogVisible.value = true
    editInputRef.value?.setValue(groupName.value)
  }

  const confirmEditDialog = () => {
    const value = (editInputRef.value?.value ?? '').trim()

    if (editDialogType.value === 'nickname') {
      myNickname.value = value
      localStorage.setItem(NICKNAME_STORAGE_KEY, value)
      if (socket.value && isConnected.value) {
        socket.value.emit('update_nickname', {
          sender: currentUser.value,
          nickname: value
        })
      }
      notify?.success(t('chat.nicknameUpdated'))
    } else if (editDialogType.value === 'groupName') {
      groupName.value = value
      localStorage.setItem(GROUPNAME_STORAGE_KEY, value)
      if (socket.value && isConnected.value) {
        socket.value.emit('update_group_name', {
          groupName: value,
          updatedBy: myNickname.value || currentUser.value
        })
      }
      notify?.success(t('chat.groupNameUpdated'))
    }

    editDialogVisible.value = false
  }

  return {
    editDialogVisible,
    editDialogTitle,
    editDialogPlaceholder,
    editInputRef,
    openNicknameEditor,
    openGroupNameEditor,
    confirmEditDialog
  }
}
