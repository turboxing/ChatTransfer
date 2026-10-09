import { nextTick } from 'vue'

export function parseFileName(url) {
  if (!url) return ''
  try {
    return decodeURIComponent(url.split('/').pop())
  } catch {
    return 'file'
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'

  const unit = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.floor(Math.log(bytes) / Math.log(unit))
  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`
}

export function getColorByName(name) {
  if (!name) return '#ccc'

  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 65%, 45%)`
}

export function formatTextContent(text) {
  if (!text) return ''

  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  return escapedText.replace(/(https?:\/\/[^\s]+)/g, (url) => (
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`
  ))
}

export function useClipboard({ t, notify }) {
  const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)

    if (!successful) {
      notify?.error(t('messages.copyFailed'))
      throw new Error('Copy failed')
    }
  }

  const copyItem = async (item) => {
    try {
      const content = item.rawType === 'FILE' || item.rawType === 'IMAGE' ? item.fileUrl : item.content
      await copyToClipboard(content)
      notify?.success(item.rawType === 'FILE' || item.rawType === 'IMAGE' ? t('chat.linkCopied') : t('messages.copySuccess'))
    } catch (error) {
      console.error(error)
      notify?.error(t('messages.copyFailed'))
    }
  }

  const copyCachePath = async (path) => {
    if (!path) {
      notify?.warning(t('tools.cachePathInputPlaceholder'))
      return
    }

    try {
      await copyToClipboard(path)
      notify?.success(t('chat.pathCopied'))
    } catch {
      notify?.error(t('messages.copyFailed'))
    }
  }

  return {
    copyToClipboard,
    copyItem,
    copyCachePath
  }
}
