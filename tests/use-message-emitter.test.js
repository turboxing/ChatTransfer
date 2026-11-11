import { describe, expect, it, vi } from 'vitest'
import { useMessageEmitter } from '../frontend/src/composables/use-message-emitter'

const ref = (value) => ({ value })

describe('useMessageEmitter', () => {
  it('calls onSent only after a successful server acknowledgement', () => {
    const rawMessages = ref([{
      msgId: 'message-1',
      sender: 'user-a',
      content: 'hello',
      status: 'sending'
    }])
    const saveMessage = vi.fn()
    const onSent = vi.fn()
    const socket = ref({
      emit: (event, payload, ack) => ack({
        ...payload,
        seq: 12,
        createdAt: 123,
        status: 'success'
      })
    })

    useMessageEmitter({
      socket,
      isConnected: ref(true),
      targetUser: ref('room-a'),
      rawMessages,
      saveMessage,
      onSent
    }).emitMessage({
      msgId: 'message-1',
      sender: 'user-a',
      content: 'hello'
    })

    expect(rawMessages.value[0]).toMatchObject({
      msgId: 'message-1',
      status: 'success',
      seq: 12
    })
    expect(saveMessage).toHaveBeenCalledWith(rawMessages.value[0])
    expect(onSent).toHaveBeenCalledWith(rawMessages.value[0])
  })

  it('does not call onSent when persistence fails', () => {
    const rawMessages = ref([{ msgId: 'message-1', status: 'sending' }])
    const onSent = vi.fn()
    const socket = ref({
      emit: (event, payload, ack) => ack({
        ...payload,
        status: 'failed',
        error: 'Message persistence failed'
      })
    })

    useMessageEmitter({
      socket,
      isConnected: ref(true),
      targetUser: ref('room-a'),
      rawMessages,
      saveMessage: vi.fn(),
      onSent
    }).emitMessage({ msgId: 'message-1', content: 'hello' })

    expect(onSent).not.toHaveBeenCalled()
  })
})
