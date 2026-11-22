const LANGUAGES = {
  js: 'javascript', cjs: 'javascript', mjs: 'javascript', jsx: 'jsx',
  ts: 'typescript', tsx: 'tsx', py: 'python', java: 'java', kt: 'kotlin',
  swift: 'swift', go: 'go', rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp',
  css: 'css', scss: 'scss', less: 'less', vue: 'vue', svelte: 'svelte',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini', conf: 'ini', cfg: 'ini',
  properties: 'properties', xml: 'xml', sh: 'shellscript', bash: 'shellscript', zsh: 'shellscript',
  ps1: 'powershell', bat: 'bat', sql: 'sql', md: 'markdown', markdown: 'markdown'
}
const NAMES = { dockerfile: 'dockerfile', makefile: 'makefile', '.editorconfig': 'ini' }
export const HIGHLIGHT_LIMIT = 64 * 1024
export const MARKDOWN_LIMIT = 128 * 1024

export function previewLanguage(name) {
  const normalized = String(name || '').split(/[\\/]/).pop().toLowerCase()
  const extension = normalized.split('.').pop()
  return Object.hasOwn(NAMES, normalized) ? NAMES[normalized]
    : Object.hasOwn(LANGUAGES, extension) ? LANGUAGES[extension] : ''
}

export function canRenderRich(content, mode) {
  const limit = mode === 'reading' ? MARKDOWN_LIMIT : HIGHLIGHT_LIMIT
  return content.length <= limit && new TextEncoder().encode(content).length <= limit
    && content.split('\n').length <= 2000
}

export function decorateCode(tokens, matches, queryLength) {
  const result = []
  let offset = 0
  let matchIndex = 0
  for (const token of tokens) {
    let position = 0
    while (position < token.content.length) {
      while (matchIndex < matches.length && matches[matchIndex] + queryLength <= offset + position) matchIndex += 1
      const start = matches[matchIndex]
      const selected = start !== undefined && start <= offset + position
      const boundary = start === undefined ? Infinity : selected ? start + queryLength : start
      const end = Math.min(token.content.length, boundary - offset)
      result.push({ text: token.content.slice(position, end), color: token.color, match: selected ? matchIndex : -1 })
      position = end
    }
    offset += token.content.length
  }
  return result
}
