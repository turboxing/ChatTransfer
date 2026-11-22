import { describe, expect, it } from 'vitest'
import { toAbsoluteUrl, getFileExtension } from '../frontend/src/composables/use-message-utils'

describe('getFileExtension', () => {
  it('extracts a separate readable format for long and multi-dot names', () => {
    expect(getFileExtension('很长的中文文件名-'.repeat(20) + '风险源清单 (1).csv')).toBe('CSV')
    expect(getFileExtension('script.test.cjs')).toBe('CJS')
    expect(getFileExtension('C:\\files\\test.log')).toBe('LOG')
    expect(getFileExtension('file.')).toBe('—')
    expect(getFileExtension('README', 'unknown')).toBe('unknown')
    expect(getFileExtension('.env', 'unknown')).toBe('unknown')
  })
})

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
