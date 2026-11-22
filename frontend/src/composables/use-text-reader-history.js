import { onBeforeUnmount, onMounted } from 'vue'

export function useTextReaderHistory({ qrVisible, onClose }) {
  const marker = `reader-${Date.now()}-${Math.random()}`
  let active = false
  let closing = false
  const push = () => {
    window.history.pushState({ ...window.history.state, textReader: marker }, '', window.location.href)
    active = true
  }
  const onPop = event => {
    if (!active) return
    event.stopImmediatePropagation()
    if (qrVisible.value && !closing) {
      qrVisible.value = false
      try { push() } catch { active = false; onClose() }
    } else {
      active = false
      onClose()
    }
  }
  const close = () => {
    if (closing) return
    closing = true
    qrVisible.value = false
    if (active && window.history.state?.textReader === marker) window.history.back()
    else { active = false; onClose() }
  }
  onMounted(() => {
    window.addEventListener('popstate', onPop, true)
    try { push() } catch { active = false }
  })
  onBeforeUnmount(() => {
    window.removeEventListener('popstate', onPop, true)
    if (!active || window.history.state?.textReader !== marker) return
    const url = window.location.href
    const state = { ...window.history.state }
    delete state.textReader
    const cleanup = event => {
      event.stopImmediatePropagation()
      window.removeEventListener('popstate', cleanup, true)
      window.history.replaceState(state, '', url)
    }
    window.addEventListener('popstate', cleanup, true)
    window.history.back()
  })
  return { close }
}
