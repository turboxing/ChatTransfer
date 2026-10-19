import { describe, expect, it } from 'vitest'
import {
  generateDefaultNickname,
  useDefaultNickname
} from '../frontend/src/composables/use-default-nickname'

describe('useDefaultNickname', () => {
  it('generates a Chinese nickname for Chinese locales', () => {
    expect(generateDefaultNickname('zh-CN', () => 0x1234 / 0x10000)).toBe('用户_1234')
  })

  it('generates an English nickname for other locales', () => {
    expect(generateDefaultNickname('en', () => 0x00ab / 0x10000)).toBe('User_00AB')
  })

  it('reuses a saved nickname and replaces blank values', () => {
    const locale = { value: 'zh-CN' }
    const { resolveNickname } = useDefaultNickname(locale)

    expect(resolveNickname(' Saved Nickname ')).toBe('Saved Nickname')
    expect(resolveNickname('   ')).toMatch(/^用户_[0-9A-F]{4}$/)
  })
})
