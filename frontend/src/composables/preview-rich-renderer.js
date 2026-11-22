import { canRenderRich } from './preview-render-utils'

const loaders = {
  javascript: () => import('shiki/langs/javascript.mjs'), typescript: () => import('shiki/langs/typescript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'), tsx: () => import('shiki/langs/tsx.mjs'),
  python: () => import('shiki/langs/python.mjs'), java: () => import('shiki/langs/java.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'), swift: () => import('shiki/langs/swift.mjs'),
  go: () => import('shiki/langs/go.mjs'), rust: () => import('shiki/langs/rust.mjs'),
  c: () => import('shiki/langs/c.mjs'), cpp: () => import('shiki/langs/cpp.mjs'), csharp: () => import('shiki/langs/csharp.mjs'),
  css: () => import('shiki/langs/css.mjs'), scss: () => import('shiki/langs/scss.mjs'), less: () => import('shiki/langs/less.mjs'),
  vue: () => import('shiki/langs/vue.mjs'), svelte: () => import('shiki/langs/svelte.mjs'),
  json: () => import('shiki/langs/json.mjs'), yaml: () => import('shiki/langs/yaml.mjs'),
  toml: () => import('shiki/langs/toml.mjs'), ini: () => import('shiki/langs/ini.mjs'),
  properties: () => import('shiki/langs/properties.mjs'), xml: () => import('shiki/langs/xml.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'), powershell: () => import('shiki/langs/powershell.mjs'),
  bat: () => import('shiki/langs/bat.mjs'), sql: () => import('shiki/langs/sql.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'), dockerfile: () => import('shiki/langs/dockerfile.mjs'),
  makefile: () => import('shiki/langs/makefile.mjs')
}
const ALIASES = { js: 'javascript', cjs: 'javascript', mjs: 'javascript', ts: 'typescript', py: 'python', yml: 'yaml', sh: 'shellscript', bash: 'shellscript', zsh: 'shellscript', rs: 'rust', cs: 'csharp', kt: 'kotlin', md: 'markdown' }
let highlighterPromise
async function highlighter(language) {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import('shiki/core'), import('shiki/engine/javascript'), import('shiki/themes/github-light.mjs')
    ]).then(([core, engine, theme]) => core.createHighlighterCore({
      themes: [theme.default], langs: [], engine: engine.createJavaScriptRegexEngine()
    })).catch(error => { highlighterPromise = null; throw error })
  }
  const instance = await highlighterPromise
  if (!instance.getLoadedLanguages().includes(language)) await instance.loadLanguage((await loaders[language]()).default)
  return instance
}

export async function highlightPreview(content, language) {
  language = Object.hasOwn(ALIASES, language) ? ALIASES[language] : language
  if (!Object.hasOwn(loaders, language) || !canRenderRich(content, 'highlight')) throw new Error('fallback')
  const instance = await highlighter(language)
  const lines = instance.codeToTokens(content, { lang: language, theme: 'github-light' }).tokens
  const tokens = []
  lines.forEach((line, index) => {
    if (index) tokens.push({ content: '\n' })
    line.forEach(token => tokens.push({ content: token.content, color: /^#[\da-f]{3,8}$/i.test(token.color || '') ? token.color : undefined }))
  })
  if (tokens.length > 12000 || tokens.map(token => token.content).join('') !== content) throw new Error('fallback')
  return tokens
}

export function safePreviewUrl(value, image = false) {
  try {
    const url = new URL(value)
    return (image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:']).includes(url.protocol) ? url.href : ''
  } catch { return '' }
}

export async function renderMarkdownPreview(content, { loadImages = false, imageLabel = 'Image not loaded' } = {}) {
  if (!canRenderRich(content, 'reading')) throw new Error('fallback')
  const { default: MarkdownIt } = await import('markdown-it')
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false, maxNesting: 30 })
  const tokens = md.parse(content, {})
  const escaped = md.utils.escapeHtml
  let imageCount = 0
  md.renderer.rules.image = (items, index) => {
    const token = items[index]
    const alt = md.renderer.renderInlineAsText(token.children || [], md.options, {})
    const url = safePreviewUrl(token.attrGet('src'), true)
    if (!loadImages || !url || imageCount++ >= 20) return `<span class="blocked-image">[${escaped(imageLabel)}: ${escaped(alt)}]</span>`
    return `<img src="${escaped(url)}" alt="${escaped(alt)}" loading="lazy" referrerpolicy="no-referrer">`
  }
  const visit = (items) => {
    const links = []
    for (const token of items) {
      if (token.type === 'link_open') {
        const url = safePreviewUrl(token.attrGet('href'))
        links.push(!!url)
        if (!url) { token.tag = 'span'; token.attrs = [] }
        else {
          token.attrSet('href', url)
          token.attrSet('target', '_blank')
          token.attrSet('rel', 'noopener noreferrer')
          token.attrSet('referrerpolicy', 'no-referrer')
        }
      } else if (token.type === 'link_close' && !links.pop()) token.tag = 'span'
      if (token.children) visit(token.children)
    }
  }
  visit(tokens)
  const highlighted = new Map()
  let budget = 0
  for (const token of tokens) {
    if (token.type !== 'fence' || highlighted.size >= 16) continue
    const language = token.info.trim().split(/\s+/)[0].toLowerCase()
    if (!language || budget + token.content.length > 64 * 1024) continue
    try {
      const code = await highlightPreview(token.content, language)
      budget += token.content.length
      highlighted.set(token, `<pre><code>${code.map(part => part.color ? `<span style="color:${part.color}">${escaped(part.content)}</span>` : escaped(part.content)).join('')}</code></pre>\n`)
    } catch { continue }
  }
  const originalFence = md.renderer.rules.fence
  md.renderer.rules.fence = (items, index, options, env, renderer) => highlighted.get(items[index]) || originalFence(items, index, options, env, renderer)
  return md.renderer.render(tokens, md.options, {})
}
