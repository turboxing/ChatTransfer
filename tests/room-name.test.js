import { describe, expect, it } from 'vitest'
import { generateRoomName } from '../frontend/src/utils/room-name'

describe('generateRoomName', () => {
  it('generates a localized room name with a random suffix', () => {
    const random = () => 0
    expect(generateRoomName('zh-CN', random)).toBe('快速传输 1000')
    expect(generateRoomName('ar', random)).toBe('نقل سريع 1000')
  })

  it('falls back to English for unsupported locales', () => {
    expect(generateRoomName('fr', () => 0.5)).toBe('Test Session 5500')
  })
})
