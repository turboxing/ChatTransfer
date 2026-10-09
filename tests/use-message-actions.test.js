import { describe, expect, it, vi } from 'vitest'
import {
  hasMessageMobileActions,
  useMessageActions
} from '../frontend/src/composables/use-message-actions'

const createRefs = (values) => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, { value }])
)

describe('useMessageActions', () => {
  it('shows mobile more actions only when an action is available', () => {
    expect(hasMessageMobileActions({ role: 'ai', rawType: 'TEXT' })).toBe(false)
    expect(hasMessageMobileActions({ role: 'user', rawType: 'TEXT' })).toBe(true)
    expect(hasMessageMobileActions({ role: 'ai', rawType: 'FILE', status: 'success' })).toBe(true)
    expect(hasMessageMobileActions({ role: 'user', rawType: 'FILE', status: 'success' })).toBe(true)
    expect(hasMessageMobileActions({ role: 'user', rawType: 'FILE', status: 'uploading' })).toBe(true)
    expect(hasMessageMobileActions({ role: 'ai', rawType: 'FILE', status: 'uploading' })).toBe(false)
  })

  it('sends a text message and records send history', () => {
    vi.stubGlobal('window', { chat_visitor_id: 'visitor' })
    const refs = createRefs({
      currentUser: 'user-a',
      targetUser: 'group_chat',
      inputValue: 'draft'
    })
    const rawMessages = { value: [] }
    const emitMessage = vi.fn()
    const scrollToBottom = vi.fn()
    const addSendHistory = vi.fn()
    const { handleSend } = useMessageActions({
      ...refs,
      rawMessages,
      emitMessage,
      scrollToBottom,
      addSendHistory
    })

    handleSend(' hello ')

    expect(rawMessages.value).toHaveLength(1)
    expect(rawMessages.value[0]).toMatchObject({
      sender: 'user-a',
      receiver: 'group_chat',
      text: ' hello ',
      msgType: 'TEXT',
      status: 'sending',
      visitorId: 'visitor'
    })
    expect(emitMessage).toHaveBeenCalledWith(rawMessages.value[0])
    expect(refs.inputValue.value).toBe('')
    expect(addSendHistory).toHaveBeenCalledWith('hello')
    expect(scrollToBottom).toHaveBeenCalled()
  })

  it('retries an uploaded file by emitting a new message', () => {
    const refs = createRefs({
      currentUser: 'user-a',
      targetUser: 'group_chat',
      inputValue: ''
    })
    const message = { msgId: '1', msgType: 'FILE', fileUrl: '/uploads/a.png' }
    const rawMessages = { value: [message] }
    const emitMessage = vi.fn()
    const scrollToBottom = vi.fn()
    const addSendHistory = vi.fn()
    const { handleRetry } = useMessageActions({
      ...refs,
      rawMessages,
      emitMessage,
      scrollToBottom,
      addSendHistory
    })

    handleRetry({ originalMsg: message })

    expect(rawMessages.value).toHaveLength(1)
    expect(rawMessages.value[0].msgId).not.toBe('1')
    expect(rawMessages.value[0].status).toBe('sending')
    expect(emitMessage).toHaveBeenCalledWith(rawMessages.value[0])
  })
})
