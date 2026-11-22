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

  const mockUploadResponse = () => {
    vi.stubGlobal('window', { chat_visitor_id: 'visitor' })
    vi.stubGlobal('XMLHttpRequest', class {
      constructor() { this.upload = {} }
      open() {}
      send() {
        this.status = 200
        this.responseText = JSON.stringify({ code: 0, data: { mimetype: '', fileUrl: '/files/test', size: 0 } })
        this.onload?.()
      }
    })
  }

  it('uploads LOG and CJS files when the browser reports an empty MIME type', async () => {
    mockUploadResponse()
    const { controller, rawMessages, emitMessage, notify } = createUploadHarness()
    await controller.handleUploadDrop([
      { name: 'test.log', size: 4, type: '' },
      { name: 'test.cjs', size: 9, type: '' }
    ])
    expect(emitMessage).toHaveBeenCalledTimes(2)
    expect(rawMessages.value.every(message => message.status === 'success')).toBe(true)
    expect(notify.error).not.toHaveBeenCalled()
    expect(controller.isUploading.value).toBe(false)
  })

  it('rejects detected directories while preserving ordinary files and empty files in a mixed drop', async () => {
    mockUploadResponse()
    const { controller, emitMessage, notify } = createUploadHarness()
    controller.captureDropEntries({ dataTransfer: { items: [
      { webkitGetAsEntry: () => ({ name: 'folder', isDirectory: true }) },
      { webkitGetAsEntry: () => ({ name: 'empty.log', isDirectory: false }) }
    ] } })
    await controller.handleUploadDrop([
      { name: 'folder', size: 0, type: '' },
      { name: 'empty.log', size: 0, type: '' },
      { name: 'another-folder', isDirectory: true }
    ])
    expect(emitMessage).toHaveBeenCalledTimes(1)
    expect(emitMessage.mock.calls[0][0].fileName).toBe('empty.log')
    expect(notify.error).toHaveBeenCalledWith('chat.folderUploadNotAllowed')
  })

  it('does not infer directories from missing MIME or block the next valid drop after a rejected directory', async () => {
    mockUploadResponse()
    const { controller, emitMessage } = createUploadHarness()
    await controller.handleUploadDrop([{ name: 'folder', isDirectory: true }])
    controller.captureDropEntries({ dataTransfer: { items: [{}] } })
    await controller.handleUploadDrop([{ name: 'README', size: 0, type: '' }])
    expect(emitMessage).toHaveBeenCalledTimes(1)
  })
})
