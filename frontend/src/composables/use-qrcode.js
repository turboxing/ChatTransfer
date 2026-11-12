import { ref } from 'vue'
import { toAbsoluteUrl } from './use-message-utils'

export function useQrcode({ targetUser, activeRoom, t, notify }) {
  const qrLoading = ref(false)
  const qrCodeUrl = ref('')
  const inviteUrl = ref('')
  const inviteRoom = ref(null)
  const msgQrDialogVisible = ref(false)
  const msgQrCodeUrl = ref('')
  const msgQrContent = ref('')

  const showQrCode = async (roomOverride = null) => {
    const room = roomOverride || activeRoom.value
    const roomId = room?.id || targetUser.value || 'group_chat'
    const url = roomId === 'group_chat'
      ? `${window.location.origin}/login?receiver=group_chat`
      : `${window.location.origin}/login?roomId=${encodeURIComponent(roomId)}&code=${encodeURIComponent(room?.code || '')}`

    inviteUrl.value = url
    inviteRoom.value = room || { id: roomId, name: '' }

    qrLoading.value = true
    try {
      const QRCode = await import('qrcode')
      qrCodeUrl.value = await QRCode.default.toDataURL(url, { width: 600, margin: 2 })
    } catch {
      notify?.error(t('chat.getQrFailed'))
    } finally {
      qrLoading.value = false
    }
  }

  const showItemQrCode = async (item) => {
    let content = ''
    if (item.rawType === 'TEXT') {
      content = item.content
    } else if (item.rawType === 'FILE' || item.rawType === 'IMAGE') {
      content = toAbsoluteUrl(item.fileUrl)
    }

    if (!content) {
      notify?.warning(t('chat.noQrContent'))
      return
    }

    msgQrContent.value = content
    try {
      const QRCode = await import('qrcode')
      msgQrCodeUrl.value = await QRCode.default.toDataURL(content, { width: 600, margin: 2 })
      msgQrDialogVisible.value = true
    } catch (error) {
      console.error(error)
      notify?.error(t('chat.genQrFailed'))
    }
  }

  return {
    qrLoading,
    qrCodeUrl,
    inviteUrl,
    inviteRoom,
    msgQrDialogVisible,
    msgQrCodeUrl,
    msgQrContent,
    showQrCode,
    showItemQrCode
  }
}
