import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const lifecycle = vi.hoisted(() => ({ unmount: null }))
vi.mock('vue', async importOriginal => ({ ...await importOriginal(), onBeforeUnmount: callback => { lifecycle.unmount = callback } }))
import { usePreviewRenderer } from '../frontend/src/composables/use-preview-renderer.js'

describe('preview worker lifecycle', () => {
  let workers
  beforeEach(() => {
    workers = []
    vi.useFakeTimers()
    vi.stubGlobal('Worker', class {
      constructor() { workers.push(this); this.terminate = vi.fn() }
      postMessage(request) { this.request = request }
      respond(result) { this.onmessage({ data: { id: this.request.id, ...result } }) }
    })
  })
  afterEach(() => { lifecycle.unmount?.(); vi.useRealTimers(); vi.unstubAllGlobals() })

  it('ignores stale results and terminates workers on replacement and close', () => {
    const preview = usePreviewRenderer()
    preview.render({ mode: 'reading', content: 'first' })
    preview.render({ mode: 'reading', content: 'second' })
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    workers[0].respond({ html: '<p>first</p>' })
    expect(preview.html.value).toBe('')
    workers[1].respond({ html: '<p>second</p>' })
    expect(preview.html.value).toBe('<p>second</p>')
    expect(preview.loading.value).toBe(false)
    lifecycle.unmount()
    expect(workers[1].terminate).toHaveBeenCalledOnce()
  })

  it('falls back after timeout or worker error and can retry', () => {
    const preview = usePreviewRenderer()
    preview.render({ mode: 'highlight', content: 'x' })
    vi.advanceTimersByTime(20000)
    expect(preview.failed.value).toBe(true)
    expect(preview.loading.value).toBe(false)
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    workers[0].respond({ tokens: [{ content: 'late' }] })
    expect(preview.tokens.value).toBe(null)
    preview.render({ mode: 'highlight', content: 'retry' })
    expect(preview.failed.value).toBe(false)
    workers[1].respond({ error: true })
    expect(preview.failed.value).toBe(true)
    preview.reset()
    expect(preview.failed.value).toBe(false)
  })
})
