import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GROUPNAME_STORAGE_KEY,
  NICKNAME_STORAGE_KEY,
  useIdentityEditor
} from '../frontend/src/composables/use-identity-editor'

const createComposable = ({ targetUser = 'group_chat' } = {}) => {
  const socket = { emit: vi.fn() }
  const refs = {
    currentUser: { value: 'user-a' },
    targetUser: { value: targetUser },
    myNickname: { value: 'old nickname' },
    groupName: { value: 'old group' },
    socket: { value: socket },
    isConnected: { value: true }
  }
  const notify = { success: vi.fn() }
  const identity = useIdentityEditor({
    ...refs,
    t: (key) => key,
    notify
  })

  return { refs, socket, notify, identity }
}

describe('useIdentityEditor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('updates and emits the nickname', () => {
    const { refs, socket, notify, identity } = createComposable()
    identity.editInputRef.value = { value: ' new nickname ', setValue: vi.fn() }

    identity.openNicknameEditor()
    identity.confirmEditDialog()

    expect(refs.myNickname.value).toBe('new nickname')
    expect(localStorage.getItem(NICKNAME_STORAGE_KEY)).toBe('new nickname')
    expect(socket.emit).toHaveBeenCalledWith('update_nickname', {
      sender: 'user-a',
      nickname: 'new nickname'
    })
    expect(notify.success).toHaveBeenCalledWith('chat.nicknameUpdated')
    expect(identity.editDialogVisible.value).toBe(false)
  })

  it('updates and emits the group name only in group chat', () => {
    const { refs, socket, notify, identity } = createComposable()
    identity.editInputRef.value = { value: ' new group ', setValue: vi.fn() }

    identity.openGroupNameEditor()
    identity.confirmEditDialog()

    expect(refs.groupName.value).toBe('new group')
    expect(localStorage.getItem(GROUPNAME_STORAGE_KEY)).toBe('new group')
    expect(socket.emit).toHaveBeenCalledWith('update_group_name', {
      groupName: 'new group',
      updatedBy: 'old nickname'
    })
    expect(notify.success).toHaveBeenCalledWith('chat.groupNameUpdated')
  })

  it('does not open the group name editor in private chat', () => {
    const { identity } = createComposable({ targetUser: 'user-b' })

    identity.openGroupNameEditor()

    expect(identity.editDialogVisible.value).toBe(false)
  })
})
