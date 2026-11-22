import { describe, expect, it, vi } from 'vitest'
import { createTextReaderTrigger, detectMessageContent, shouldOpenTextReader, textMessageQr } from '../frontend/src/composables/text-message-preview'

describe('text message reader', () => {
  it('suggests languages without changing the source', () => {
    const source = '```python\ndef greet(name):\n    return name\n```'
    expect(detectMessageContent(source)).toEqual({ language: 'python', markdown: true })
    expect(source).toContain('    return name')
    expect(detectMessageContent('const name = "hi";').language).toBe('javascript')
    expect(detectMessageContent('def greet():\n    pass').language).toBe('python')
    expect(detectMessageContent('{"a":1}').language).toBe('json')
    expect(detectMessageContent('# Heading\n\n- **item**').markdown).toBe(true)
    expect(detectMessageContent('Hello, this is a normal message.')).toEqual({ language: '', markdown: false })
    expect(detectMessageContent('```constructor\nx\n```').language).toBe('markdown')
    expect(detectMessageContent('x'.repeat(16384) + '\nconst late = 1').language).toBe('')
  })
  it('preserves selection mode, links, buttons and selected text', () => {
    const text = { rawType: 'TEXT' }
    const event = { target: { closest: () => null } }
    expect(shouldOpenTextReader(text, event, false)).toBe(true)
    expect(shouldOpenTextReader(text, event, true)).toBe(false)
    expect(shouldOpenTextReader(text, event, false, 'selected')).toBe(false)
    expect(shouldOpenTextReader(text, { ...event, defaultPrevented: true }, false)).toBe(false)
    expect(shouldOpenTextReader(text, { target: { closest: () => ({}) } }, false)).toBe(false)
    expect(shouldOpenTextReader({ rawType: 'FILE' }, event, false)).toBe(false)
  })
  it('encodes the full UTF-8 text and rejects excessive input instead of truncating', async () => {
    const content = '你好 👋\n  **Markdown**\nhttps://example.com'
    const result = await textMessageQr(content)
    expect(result).toMatch(/^data:image\/png;base64,/)
    expect(Buffer.from(result.split(',')[1], 'base64').subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    await expect(textMessageQr('汉'.repeat(800))).rejects.toThrow('qr-too-long')
    await expect(textMessageQr('x'.repeat(2332))).rejects.toThrow('qr-too-long')
  })
  it('allows double-click selection and cancels stale delayed opens', () => {
    vi.useFakeTimers()
    try {
      const onOpen = vi.fn()
      let current = true, selected = ''
      const item = { rawType: 'TEXT' }
      const trigger = createTextReaderTrigger({ isSelecting: () => false, getSelection: () => selected, isCurrent: () => current, onOpen })
      const event = { detail: 1, target: { closest: () => null } }
      trigger.handle(item, event)
      selected = 'word'
      trigger.handle(item, { ...event, detail: 2 })
      vi.advanceTimersByTime(500)
      expect(onOpen).not.toHaveBeenCalled()
      selected = ''
      trigger.handle(item, event)
      current = false
      vi.advanceTimersByTime(500)
      expect(onOpen).not.toHaveBeenCalled()
      current = true
      trigger.handle(item, event)
      vi.advanceTimersByTime(300)
      expect(onOpen).toHaveBeenCalledOnce()
      onOpen.mockClear()
      trigger.handle(item, event)
      trigger.cancel()
      vi.advanceTimersByTime(500)
      expect(onOpen).not.toHaveBeenCalled()
      trigger.handle(item, { ...event, type: 'keydown', preventDefault: vi.fn() })
      expect(onOpen).toHaveBeenCalledOnce()
    } finally { vi.useRealTimers() }
  })
})
