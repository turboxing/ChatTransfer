import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NICKNAME_STORAGE_KEY } from '../frontend/src/composables/use-identity-editor'
import { useChatSession } from '../frontend/src/composables/use-chat-session'

describe('useChatSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes session state from URL and storage', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?sender=user-a&receiver=group_chat&nickname=URL%20Nickname'
      }
    })
    const refs = {
      currentUser: { value: '' },
      targetUser: { value: '' },
      myNickname: { value: '' },
      groupName: { value: '' },
      pendingRoomCode: { value: null }
    }
    const loadHistory = vi.fn()
    const connectSocket = vi.fn()
    const fetchVersionInfo = vi.fn()

    const { initSession } = useChatSession({
      ...refs,
      loadHistory,
      connectSocket,
      fetchVersionInfo
    })
    initSession()

    expect(refs.currentUser.value).toBe('user-a')
    expect(refs.targetUser.value).toBe('group_chat')
    expect(refs.myNickname.value).toBe('URL Nickname')
    expect(refs.groupName.value).toBe('')
    expect(loadHistory).toHaveBeenCalled()
    expect(connectSocket).toHaveBeenCalled()
    expect(fetchVersionInfo).toHaveBeenCalled()
  })

  it('initializes room id and invite code from URL', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?sender=user-a&roomId=room-uuid&code=ABCD2345&roomName=Project%20A'
      }
    })
    const refs = {
      currentUser: { value: '' },
      targetUser: { value: '' },
      myNickname: { value: '' },
      groupName: { value: '' },
      pendingRoomCode: { value: null }
    }
    const loadHistory = vi.fn()
    const connectSocket = vi.fn()
    const fetchVersionInfo = vi.fn()

    useChatSession({ ...refs, loadHistory, connectSocket, fetchVersionInfo }).initSession()

    expect(refs.targetUser.value).toBe('room-uuid')
    expect(refs.pendingRoomCode.value).toBe('ABCD2345')
    expect(refs.groupName.value).toBe('Project A')
  })
})
