import { previewLanguage } from './preview-render-utils'

export function detectMessageContent(text) {
  const sample = String(text || '').slice(0, 16384)
  const fence = sample.match(/^\s*```([\w+-]+)[^\n]*\n/m)
  const aliases = { javascript: 'js', typescript: 'ts', python: 'py', shell: 'sh', bash: 'sh', rust: 'rs', csharp: 'cs', kotlin: 'kt', powershell: 'ps1', shellscript: 'sh' }
  const fencedLanguage = fence ? previewLanguage(`code.${Object.hasOwn(aliases, fence[1].toLowerCase()) ? aliases[fence[1].toLowerCase()] : fence[1]}`) : ''
  if (fencedLanguage) return { language: fencedLanguage, markdown: true }
  const markdown = /^\s{0,3}#{1,6}\s+\S/m.test(sample)
    || /^\s*```/m.test(sample)
    || (/^\s*[-*+]\s+\S/m.test(sample) && /\*\*[^\n]+\*\*|\[[^\n]+\]\([^)]+\)/.test(sample))
  if (markdown) return { language: 'markdown', markdown: true }
  if (sample.trim().startsWith('{') || sample.trim().startsWith('[')) {
    try { JSON.parse(sample); return { language: 'json', markdown: false } } catch { /* Continue with syntax hints. */ }
  }
  if (/^\s*(?:async\s+)?def\s+\w+\s*\([^\n]*\)\s*(?:->[^\n:]+)?\s*:/m.test(sample)
    || /^\s*(?:from\s+[\w.]+\s+import\s+|import\s+[\w.]+\s*$)/m.test(sample)) return { language: 'python', markdown: false }
  if (/^\s*(?:(?:export|async)\s+)*(?:function\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*=)/m.test(sample)) return { language: 'javascript', markdown: false }
  if (/^#![^\n]*\b(?:bash|sh|zsh)\b/m.test(sample)) return { language: 'shellscript', markdown: false }
  return { language: '', markdown: false }
}

export function shouldOpenTextReader(item, event, selectionMode, selection = '') {
  if (selectionMode || item?.rawType !== 'TEXT' || selection || event?.defaultPrevented) return false
  return !event?.target?.closest?.('a, button, input, textarea, select, [role="button"]')
}

export function createTextReaderTrigger({ isSelecting, getSelection, isCurrent, onOpen }) {
  let timer
  const cancel = () => clearTimeout(timer)
  const handle = (item, event) => {
    cancel()
    if (event.detail > 1 || !shouldOpenTextReader(item, event, isSelecting(), getSelection())) return
    if (event.type === 'keydown' || event.detail === 0) {
      event.preventDefault?.()
      onOpen(item)
      return
    }
    timer = setTimeout(() => {
      if (isCurrent(item) && shouldOpenTextReader(item, event, isSelecting(), getSelection())) onOpen(item)
    }, 300)
  }
  return { handle, cancel }
}

export async function textMessageQr(text) {
  if (new TextEncoder().encode(text).length > 2331) throw new Error('qr-too-long')
  const { default: QRCode } = await import('qrcode')
  return QRCode.toDataURL([{ data: text, mode: 'byte' }], { width: 600, margin: 2, errorCorrectionLevel: 'M' })
}
