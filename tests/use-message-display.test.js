import { describe, expect, it } from 'vitest'
import { useMessageDisplay } from '../frontend/src/composables/use-message-display'
import { parseFileName } from '../frontend/src/composables/use-message-utils'

const createRefs = (values) => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, { value }])
)

describe('useMessageDisplay', () => {
  it('builds bubble items and resolves display metadata', () => {
    const refs = createRefs({
      currentUser: 'user-a',
      targetUser: 'group_chat',
      myNickname: 'My Nickname',
      groupName: '',
      onlineUsers: [
        { sender: 'user-b', nickname: 'User B', ip: '192.168.1.2', status: 'ONLINE' },
        { sender: 'user-c', nickname: 'User C', ip: '192.168.1.3', status: 'OFFLINE' }
      ],
      rawMessages: [
        { msgId: '1', sender: 'user-a', receiver: 'group_chat', text: 'hello', msgType: 'TEXT', time: 'now' },
        { msgId: '2', sender: 'user-b', receiver: 'group_chat', msgType: 'FILE', fileUrl: '/uploads/a%20b.txt' }
      ]
    })

    const display = useMessageDisplay({
      ...refs,
      isMessagePinned: (msgId) => msgId === '2',
      parseFileName,
      t: (key) => key
    })

    expect(display.onlineCount.value).toBe(1)
    expect(display.displayGroupName.value).toBe('chat.defaultGroupName')
    expect(display.getDisplayName(refs.rawMessages.value[0])).toBe('My Nickname')
    expect(display.getDisplayName(refs.rawMessages.value[1])).toBe('User B')
    expect(display.getDisplayIp(refs.rawMessages.value[1])).toBe('192.168.1.2')
    expect(display.bubbleItems.value[0]).toMatchObject({
      role: 'user',
      placement: 'end',
      content: 'hello',
      status: 'success',
      isPinned: false
    })
    expect(display.bubbleItems.value[1]).toMatchObject({
      role: 'ai',
      placement: 'start',
      content: 'chat.fileTag',
      fileName: 'a b.txt',
      status: 'success',
      isPinned: true
    })
  })
})
