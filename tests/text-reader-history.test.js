import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const lifecycle = vi.hoisted(() => ({ mount: null, unmount: null }))
vi.mock('vue', () => ({ onMounted: cb => { lifecycle.mount = cb }, onBeforeUnmount: cb => { lifecycle.unmount = cb } }))
import { useTextReaderHistory } from '../frontend/src/composables/use-text-reader-history'

describe('text reader back navigation', () => {
  let entries, listeners, location, history, qrVisible, onClose, reader
  beforeEach(() => {
    entries = [{ state: { position: 1 }, url: '/chat?receiver=group_chat' }]
    listeners = new Set()
    location = { href: entries[0].url }
    history = {
      get state() { return entries.at(-1).state },
      pushState(state, _, url) { entries.push({ state, url }); location.href = url },
      replaceState(state, _, url) { entries[entries.length - 1] = { state, url }; location.href = url },
      back() {
        entries.pop(); location.href = entries.at(-1).url
        const event = { stopImmediatePropagation: vi.fn() }
        for (const listener of [...listeners]) listener(event)
      }
    }
    vi.stubGlobal('window', { history, location, addEventListener: (_, cb) => listeners.add(cb), removeEventListener: (_, cb) => listeners.delete(cb) })
    qrVisible = { value: false }; onClose = vi.fn()
    reader = useTextReaderHistory({ qrVisible, onClose })
    lifecycle.mount()
  })
  afterEach(() => { lifecycle.unmount(); vi.unstubAllGlobals() })
  it('closes QR first and then the reader without leaving the chat', () => {
    qrVisible.value = true
    history.back()
    expect(qrVisible.value).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
    expect(entries).toHaveLength(2)
    history.back()
    expect(onClose).toHaveBeenCalledOnce()
    expect(entries).toHaveLength(1)
  })
  it('removes its entry on manual close and does not retain message content', () => {
    expect(Object.keys(history.state).sort()).toEqual(['position', 'textReader'])
    reader.close()
    reader.close()
    expect(onClose).toHaveBeenCalledOnce()
    expect(entries).toHaveLength(1)
  })
  it('preserves a changed room URL when the reader is removed by room switching', () => {
    history.replaceState(history.state, '', '/chat?roomId=new')
    lifecycle.unmount()
    expect(location.href).toBe('/chat?roomId=new')
    expect(history.state.textReader).toBeUndefined()
    expect(listeners.size).toBe(0)
  })
})
