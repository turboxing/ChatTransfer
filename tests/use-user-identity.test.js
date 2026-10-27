import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  USER_ID_STORAGE_KEY,
  useUserId
} from '../frontend/src/composables/use-user-identity'

describe('useUserId', () => {
  let storage

  beforeEach(() => {
    storage = new Map()
    storage.getItem = (key) => storage.get(key) ?? null
    storage.setItem = (key, value) => storage.set(key, value)
  })

  it('reuses the saved user ID across restarts', () => {
    storage.setItem(USER_ID_STORAGE_KEY, 'user-a')
    const { getUserId } = useUserId(storage)

    expect(getUserId()).toBe('user-a')
    expect(getUserId()).toBe('user-a')
    expect(storage.get(USER_ID_STORAGE_KEY)).toBe('user-a')
  })

  it('generates and stores a user ID when none exists', () => {
    const { getUserId } = useUserId(storage, () => 'generated-user')

    expect(getUserId()).toBe('generated-user')
    expect(storage.get(USER_ID_STORAGE_KEY)).toBe('generated-user')
  })

  it('replaces blank saved values with a generated user ID', () => {
    storage.setItem(USER_ID_STORAGE_KEY, '   ')
    const { getUserId } = useUserId(storage, () => 'generated-user')

    expect(getUserId()).toBe('generated-user')
    expect(storage.get(USER_ID_STORAGE_KEY)).toBe('generated-user')
  })

  it('generates a user ID without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {})
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(0x1234)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0x1234 / 0x10000)
    const { getUserId } = useUserId(storage)

    expect(getUserId()).toBe('1234-1234')
    expect(storage.get(USER_ID_STORAGE_KEY)).toBe('1234-1234')

    dateSpy.mockRestore()
    randomSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
