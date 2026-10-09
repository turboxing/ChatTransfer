import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GROUPNAME_STORAGE_KEY,
  NICKNAME_STORAGE_KEY
} from '../frontend/src/composables/use-identity-editor'
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
    localStorage.setItem(GROUPNAME_STORAGE_KEY, 'Saved Group')
    const refs = {
      currentUser: { value: '' },
      targetUser: { value: '' },
      myNickname: { value: '' },
      groupName: { value: '' }
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
    expect(refs.groupName.value).toBe('Saved Group')
    expect(loadHistory).toHaveBeenCalled()
    expect(connectSocket).toHaveBeenCalled()
    expect(fetchVersionInfo).toHaveBeenCalled()
  })
})
