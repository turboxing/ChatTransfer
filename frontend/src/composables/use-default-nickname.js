export function generateDefaultNickname(locale, random = Math.random) {
  const normalizedLocale = String(locale || '').toLowerCase()
  const prefix = normalizedLocale.startsWith('zh') ? '用户' : 'User'
  const suffix = Math.floor(random() * 0x10000)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0')

  return `${prefix}_${suffix}`
}

export function useDefaultNickname(locale) {
  const generateNickname = () => generateDefaultNickname(locale.value)

  const resolveNickname = (savedNickname) => {
    return savedNickname?.trim() || generateNickname()
  }

  return {
    generateNickname,
    resolveNickname
  }
}
