export function getDeviceLabel(userAgent, fallback = 'Browser') {
  const normalizedUserAgent = String(userAgent || '')
  if (!normalizedUserAgent) return fallback

  const platform = /iPhone/i.test(normalizedUserAgent)
    ? 'iPhone'
    : /iPad/i.test(normalizedUserAgent)
      ? 'iPad'
      : /Android/i.test(normalizedUserAgent)
        ? 'Android'
        : /Macintosh|Mac OS X/i.test(normalizedUserAgent)
          ? 'macOS'
          : /Windows/i.test(normalizedUserAgent)
            ? 'Windows'
            : /Linux/i.test(normalizedUserAgent)
              ? 'Linux'
              : ''

  const browser = /Edg\//i.test(normalizedUserAgent)
    ? 'Edge'
    : /Firefox\//i.test(normalizedUserAgent)
      ? 'Firefox'
      : /CriOS|Chrome\//i.test(normalizedUserAgent)
        ? 'Chrome'
        : /Safari\//i.test(normalizedUserAgent)
          ? 'Safari'
          : ''

  return [browser, platform].filter(Boolean).join(' · ') || fallback
}
