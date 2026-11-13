import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFileUpload } from '../frontend/src/composables/use-file-upload'

const createUploadHarness = () => {
  const rawMessages = { value: [] }
  const currentUser = { value: 'user-a' }
  const targetUser = { value: 'group_chat' }
  const emitMessage = vi.fn()
  const saveMessage = vi.fn()
  const notify = {
    error: vi.fn(),
    success: vi.fn()
  }
  const controller = useFileUpload({
    currentUser,
    targetUser,
    rawMessages,
    saveMessage,
    emitMessage,
    scrollToBottom: vi.fn(),
    t: (key) => key,
    notify
  })

  return { controller, rawMessages, emitMessage, saveMessage, notify }
}

describe('useFileUpload', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards the pasted file from ChatFooter', () => {
    const footer = readFileSync(
      new URL('../frontend/src/components/chat/ChatFooter.vue', import.meta.url),
      'utf8'
    )

    expect(footer).toContain('@paste-file="$emit(\'paste-file\', $event)"')
  })

  it('resets upload loading after a successful pasted file is sent', async () => {
    vi.stubGlobal('window', { chat_visitor_id: 'visitor' })
    vi.stubGlobal('XMLHttpRequest', class {
      constructor() {
        this.upload = {}
      }

      open() {}

      send() {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 })
        this.status = 200
        this.responseText = JSON.stringify({
          code: 0,
          data: {
            mimetype: 'text/plain',
            fileUrl: '/files/pasted.txt',
            size: 6
          }
        })
        this.onload?.()
      }
    })

    const { controller, rawMessages, emitMessage, saveMessage } = createUploadHarness()

    await controller.handlePasteFile({
      name: 'pasted.txt',
      size: 6,
      type: 'text/plain'
    })

    expect(controller.isUploading.value).toBe(false)
    expect(rawMessages.value[0]).toMatchObject({
      fileName: 'pasted.txt',
      status: 'success',
      fileUrl: '/files/pasted.txt'
    })
    expect(emitMessage).toHaveBeenCalledTimes(1)
    expect(saveMessage).toHaveBeenCalledTimes(1)
  })

  it('does not get stuck loading when the paste payload is missing', async () => {
    const { controller } = createUploadHarness()

    await controller.handlePasteFile(undefined)

    expect(controller.isUploading.value).toBe(false)
  })
})
