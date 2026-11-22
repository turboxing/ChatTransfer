import { onBeforeUnmount, ref } from 'vue'

export function usePreviewRenderer() {
  const tokens = ref(null)
  const html = ref('')
  const loading = ref(false)
  const failed = ref(false)
  let worker
  let sequence = 0
  let timer
  const cancel = () => {
    sequence += 1
    clearTimeout(timer)
    worker?.terminate()
    worker = null
    loading.value = false
  }
  const reset = () => {
    cancel()
    tokens.value = null
    html.value = ''
    failed.value = false
  }
  const render = (request) => {
    reset()
    const current = sequence
    loading.value = true
    const fallback = () => {
      if (current !== sequence) return
      cancel()
      failed.value = true
    }
    try {
      worker = new Worker(new URL('./preview-render.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }) => {
        if (data.id !== current || current !== sequence) return
        clearTimeout(timer)
        loading.value = false
        if (data.error) { fallback(); return }
        tokens.value = data.tokens || null
        html.value = data.html || ''
      }
      worker.onerror = fallback
      timer = setTimeout(fallback, 20000)
      worker.postMessage({ ...request, id: current })
    } catch { fallback() }
  }
  onBeforeUnmount(cancel)
  return { tokens, html, loading, failed, reset, render }
}
