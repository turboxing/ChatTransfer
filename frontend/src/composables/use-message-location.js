export function useMessageLocation({ t, notify }) {
  const flashMessage = (msgId) => {
    const anchor = document.getElementById(`msg-${msgId}`)
    const bubble = anchor?.closest?.('.el-bubble')
    if (!bubble) return

    bubble.classList.remove('locate-highlight')
    void bubble.offsetWidth
    bubble.classList.add('locate-highlight')
    window.setTimeout(() => {
      bubble.classList.remove('locate-highlight')
    }, 1200)
  }

  const scrollToMessage = (msgId) => {
    const element = document.getElementById(`msg-${msgId}`)
    if (!element) {
      notify?.warning(t('chat.locateFailed'))
      return
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      flashMessage(msgId)
    }, 450)
  }

  return { scrollToMessage }
}
