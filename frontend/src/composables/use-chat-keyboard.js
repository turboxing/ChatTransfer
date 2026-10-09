import { nextTick, ref } from 'vue'

export function useChatKeyboard({
  footerRef,
  sendHistory,
  navigateSendHistory
}) {
  const slashKeyTimes = ref([])

  const handleKeydown = (event) => {
    if (event.key !== '/') return

    const now = Date.now()
    slashKeyTimes.value.push(now)
    slashKeyTimes.value = slashKeyTimes.value.filter((time) => now - time < 1000)

    if (slashKeyTimes.value.length < 2) return

    const senderInput = footerRef.value?.focusInput()
    if (senderInput && document.activeElement !== senderInput) {
      event.preventDefault()
      nextTick(() => {
        senderInput.focus()
      })
    }

    slashKeyTimes.value = []
  }

  const handleHistoryKeydown = (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    if (sendHistory.value.length === 0) return

    const textarea = event.target
    if (event.key === 'ArrowUp') {
      if (textarea.selectionStart !== 0 || textarea.selectionEnd !== 0) return
      event.preventDefault()
      navigateSendHistory('up')
      return
    }

    if (
      textarea.selectionStart !== textarea.value.length ||
      textarea.selectionEnd !== textarea.value.length
    ) return
    event.preventDefault()
    navigateSendHistory('down')
  }

  return { handleKeydown, handleHistoryKeydown }
}
