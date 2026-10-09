import { ref } from 'vue'

export function useQrcode({ targetUser, t, notify }) {
  const qrDialogVisible = ref(false)
  const qrLoading = ref(false)
  const qrCodeUrl = ref('')
  const msgQrDialogVisible = ref(false)
  const msgQrCodeUrl = ref('')
  const msgQrContent = ref('')

  const showQrCode = async () => {
    qrDialogVisible.value = true
    if (qrCodeUrl.value) return

    qrLoading.value = true
    try {
      const receiver = targetUser.value || 'group_chat'
      const response = await fetch(`/getIndexInfo2?receiver=${receiver}`)
      const result = await response.json()
      if (result.code === 0 && result.data.lists && result.data.lists.length > 0) {
        qrCodeUrl.value = result.data.lists[0].qrurl
      } else {
        notify?.warning(t('chat.cannotGetQr'))
      }
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
      content = item.fileUrl
      if (content && !content.startsWith('http')) {
        content = window.location.origin + content
      }
    }

    if (!content) {
      notify?.warning(t('chat.noQrContent'))
      return
    }

    msgQrContent.value = content
    try {
      const QRCode = await import('qrcode')
      msgQrCodeUrl.value = await QRCode.default.toDataURL(content, { width: 300, margin: 2 })
      msgQrDialogVisible.value = true
    } catch (error) {
      console.error(error)
      notify?.error(t('chat.genQrFailed'))
    }
  }

  return {
    qrDialogVisible,
    qrLoading,
    qrCodeUrl,
    msgQrDialogVisible,
    msgQrCodeUrl,
    msgQrContent,
    showQrCode,
    showItemQrCode
  }
}
