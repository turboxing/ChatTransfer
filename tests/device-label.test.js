import { describe, expect, it } from 'vitest'
import { getDeviceLabel } from '../frontend/src/utils/device-label'

describe('getDeviceLabel', () => {
  it('detects the browser and platform for common devices', () => {
    expect(getDeviceLabel(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
    )).toBe('Safari · iPhone')

    expect(getDeviceLabel(
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'
    )).toBe('Chrome · Android')

    expect(getDeviceLabel(
      'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
    )).toBe('Edge · Windows')
  })

  it('uses the supplied fallback when the user agent is unavailable', () => {
    expect(getDeviceLabel('', '浏览器')).toBe('浏览器')
    expect(getDeviceLabel('unknown-client', '浏览器')).toBe('浏览器')
  })
})
