import { afterEach, describe, expect, it, vi } from 'vitest'
import { useVersionInfo } from '../frontend/src/composables/use-version-info'

describe('useVersionInfo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads version metadata from the server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({
        code: 0,
        data: { version: '2.1.0', copyright: 'ChatTransfer' }
      })
    })))

    const { version, copyright, fetchVersionInfo } = useVersionInfo()
    await fetchVersionInfo()

    expect(version.value).toBe('2.1.0')
    expect(copyright.value).toBe('ChatTransfer')
  })
})
