import { describe, expect, it } from 'vitest'
import { highlightPreview, renderMarkdownPreview, safePreviewUrl } from '../frontend/src/composables/preview-rich-renderer.js'
import { canRenderRich, decorateCode, previewLanguage } from '../frontend/src/composables/preview-render-utils.js'

describe('rich attachment previews', () => {
  it('maps source names and enforces byte and line budgets', () => {
    expect(previewLanguage('CODE.CJS')).toBe('javascript')
    expect(previewLanguage('Dockerfile')).toBe('dockerfile')
    expect(previewLanguage('.editorconfig')).toBe('ini')
    expect(previewLanguage('unknown.bin')).toBe('')
    expect(previewLanguage('constructor')).toBe('')
    expect(canRenderRich('汉'.repeat(23000), 'highlight')).toBe(false)
    expect(canRenderRich('\n'.repeat(2001), 'reading')).toBe(false)
  })
  it('highlights without changing or executing source', async () => {
    for (const [language, source] of [['javascript', 'const value = "<script>alert(1)</script>";\n'], ['python', 'def greet():\n    return "你好"\n']]) {
      const tokens = await highlightPreview(source, language)
      expect(tokens.map(token => token.content).join('')).toBe(source)
      expect(tokens.some(token => token.color)).toBe(true)
    }
    await expect(highlightPreview('x', 'unknown')).rejects.toThrow()
    await expect(highlightPreview('x', 'constructor')).rejects.toThrow()
    await expect(highlightPreview('x'.repeat(65537), 'javascript')).rejects.toThrow()
  })
  it('preserves search matches spanning syntax tokens', () => {
    const parts = decorateCode([{ content: 'const', color: '#ff0000' }, { content: ' value = 1' }], [3], 5)
    expect(parts.map(part => part.text).join('')).toBe('const value = 1')
    expect(parts.filter(part => part.match === 0).map(part => part.text).join('')).toBe('st va')
  })
  it('renders Markdown tables and code while escaping active HTML', async () => {
    const html = await renderMarkdownPreview('# Title\n\n| A | B |\n|---|---|\n|1|2|\n\n```js\nconst x = 1\n```\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n[relative](./secret)\n[safe](https://example.com)')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<table>')
    expect(html).toContain('<span style="color:')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('href="./secret')
    expect(html).toContain('rel="noopener noreferrer"')
    const hostile = await renderMarkdownPreview('```js\nconst html = "<img src=x onerror=alert(1)>"\n```\n\n![" onerror="alert(1)](https://example.com/a.png)', { loadImages: true })
    expect(hostile).not.toContain('<img src=x')
    expect(hostile).not.toContain('alt="" onerror=')
    expect(hostile).toContain('&lt;img')
  })
  it('blocks images unless explicitly enabled and caps external requests', async () => {
    const source = '![external](https://example.com/a.png)\n![relative](a.png)\n![unsafe](data:image/png;base64,xx)'
    expect(await renderMarkdownPreview(source)).not.toContain('<img ')
    const enabled = await renderMarkdownPreview(source, { loadImages: true })
    expect((enabled.match(/<img /g) || []).length).toBe(1)
    expect(enabled).toContain('referrerpolicy="no-referrer"')
    const many = await renderMarkdownPreview('![x](https://example.com/a.png)\n'.repeat(25), { loadImages: true })
    expect((many.match(/<img /g) || []).length).toBe(20)
    expect(safePreviewUrl('javascript:alert(1)')).toBe('')
    expect(safePreviewUrl('mailto:a@example.com', true)).toBe('')
    await expect(renderMarkdownPreview('x'.repeat(131073))).rejects.toThrow()
  })
})
