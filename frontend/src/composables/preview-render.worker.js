import { highlightPreview, renderMarkdownPreview } from './preview-rich-renderer'

self.onmessage = async ({ data }) => {
  try {
    const result = data.mode === 'reading'
      ? { html: await renderMarkdownPreview(data.content, data.options) }
      : { tokens: await highlightPreview(data.content, data.language) }
    self.postMessage({ id: data.id, ...result })
  } catch {
    self.postMessage({ id: data.id, error: true })
  }
}
