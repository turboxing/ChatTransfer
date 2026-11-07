import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  NICKNAME_STORAGE_KEY,
  useIdentityEditor
} from '../frontend/src/composables/use-identity-editor'

const createComposable = ({ targetUser = 'room-a' } = {}) => {
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

  it('updates and emits the room name', () => {
    const { refs, socket, notify, identity } = createComposable()
    identity.editInputRef.value = { value: ' new room ', setValue: vi.fn() }

    identity.openGroupNameEditor()
    identity.confirmEditDialog()

    expect(refs.groupName.value).toBe('new room')
    expect(socket.emit).toHaveBeenCalledWith('room_update_name', {
      roomId: 'room-a',
      name: 'new room'
    })
    expect(notify.success).toHaveBeenCalledWith('chat.groupNameUpdated')
  })

  it('does not open the name editor for the Public Lobby', () => {
    const { identity, socket } = createComposable({ targetUser: 'group_chat' })

    identity.openGroupNameEditor()

    expect(identity.editDialogVisible.value).toBe(false)
    expect(socket.emit).not.toHaveBeenCalled()
  })
})
