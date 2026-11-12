import { describe, expect, it } from 'vitest'
import { toAbsoluteUrl } from '../frontend/src/composables/use-message-utils'

describe('toAbsoluteUrl', () => {
  it('converts relative attachment paths to the current origin', () => {
    expect(toAbsoluteUrl('/files/example.png', 'http://192.168.1.10:55556'))
      .toBe('http://192.168.1.10:55556/files/example.png')
  })

  it('keeps absolute URLs unchanged', () => {
    expect(toAbsoluteUrl('https://example.com/files/example.png', 'http://127.0.0.1:55556'))
      .toBe('https://example.com/files/example.png')
  })

  it('returns an empty string when no URL is provided', () => {
    expect(toAbsoluteUrl('', 'http://127.0.0.1:55556')).toBe('')
  })
})
