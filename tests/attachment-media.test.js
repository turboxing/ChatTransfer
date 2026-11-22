import { describe, it, expect, vi } from 'vitest'
import { createMediaPlayback, getAttachmentMediaKind } from '../frontend/src/composables/use-attachment-media'

describe('attachment media playback', () => {
  it('keeps only one owner active, including across inline and dialog players', () => {
    const playback = createMediaPlayback()
    const inline = Symbol('inline')
    const dialog = Symbol('dialog')
    const stopInline = vi.fn(() => playback.release(inline))
    const stopDialog = vi.fn()
    playback.activate(inline, stopInline)
    playback.activate(inline, stopInline)
    expect(stopInline).not.toHaveBeenCalled()
    playback.activate(dialog, stopDialog)
    expect(stopInline).toHaveBeenCalledTimes(1)
    playback.release(inline)
    playback.stop()
    expect(stopDialog).toHaveBeenCalledTimes(1)
    playback.stop()
    expect(stopDialog).toHaveBeenCalledTimes(1)
  })

  it('does not stop an already released player', () => {
    const playback = createMediaPlayback()
    const owner = Symbol('audio')
    const stop = vi.fn()
    playback.activate(owner, stop)
    playback.release(owner)
    playback.stop()
    expect(stop).not.toHaveBeenCalled()
  })

  it('recognizes media by extension and leaves other files as cards', () => {
    expect(getAttachmentMediaKind('录音.MP3')).toBe('audio')
    expect(getAttachmentMediaKind('video.test.mp4')).toBe('video')
    expect(getAttachmentMediaKind('code.cjs')).toBe('file')
    expect(getAttachmentMediaKind('file.pdf')).toBe('file')
    expect(getAttachmentMediaKind('README')).toBe('file')
    expect(getAttachmentMediaKind('mp3')).toBe('file')
  })
})
