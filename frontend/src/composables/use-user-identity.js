export const USER_ID_STORAGE_KEY = 'im_chat_user_id'

function generateFallbackUserId() {
  const timestamp = Date.now().toString(16)
  const random = Math.random().toString(16).slice(2, 10)
  return `${timestamp}-${random}`
}

export function useUserId(storage = localStorage, generateUserId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return generateFallbackUserId()
}) {
  const getUserId = () => {
    const savedUserId = typeof storage.getItem(USER_ID_STORAGE_KEY) === 'string'
      ? storage.getItem(USER_ID_STORAGE_KEY)
      : ''
    const userId = savedUserId.trim() || generateUserId()

    if (!userId) {
      throw new Error('Failed to generate user ID')
    }

    storage.setItem(USER_ID_STORAGE_KEY, userId)
    return userId
  }

  return { getUserId }
}
