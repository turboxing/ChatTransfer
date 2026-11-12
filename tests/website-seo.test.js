import { describe, expect, it } from 'vitest'
const fs = require('node:fs')
const path = require('node:path')

const websiteDir = path.join(__dirname, '../website')
const read = (fileName) => fs.readFileSync(path.join(websiteDir, fileName), 'utf8')

describe('website discovery metadata', () => {
  it('keeps llms.txt and llm.txt identical, BOM-free, and factual', () => {
    const llms = read('llms.txt')
    const llm = read('llm.txt')

    expect(llms).toBe(llm)
    expect(llms.charCodeAt(0)).not.toBe(0xfeff)
    expect(llms).toContain('https://turboxing.github.io/ChatTransfer/')
    expect(llms).toContain('Latest reviewed version: 3.1.1')
    expect(llms).toContain('Chinese, English, and Arabic')
    expect(llms).toContain('is not peer-to-peer software, and is not end-to-end encrypted by default')
    expect(llms.toLowerCase()).not.toContain('telemetry')
  })

  it('allows search and AI crawlers and advertises the sitemap', () => {
    const robots = read('robots.txt')

    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('User-agent: GPTBot')
    expect(robots).toContain('User-agent: OAI-SearchBot')
    expect(robots).toContain('User-agent: ClaudeBot')
    expect(robots).toContain('User-agent: PerplexityBot')
    expect(robots).toContain('Sitemap: https://turboxing.github.io/ChatTransfer/sitemap.xml')
  })

  it('publishes canonical, LLM, social, and structured metadata', () => {
    const html = read('index.html')
    const sitemap = read('sitemap.xml')
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)

    expect(html).toContain('rel="canonical" href="https://turboxing.github.io/ChatTransfer/"')
    expect(html).toContain('type="text/markdown" href="./llms.txt"')
    expect(html).toContain('property="og:image:width" content="1200"')
    expect(html).toContain('name="twitter:description"')
    expect(html).toContain('中文、English、العربية')
    expect(html).not.toContain('官方发布包默认开启匿名')
    expect(html).not.toContain('CHATTRANSFER_TELEMETRY')
    expect(sitemap).toContain('<lastmod>2026-11-12</lastmod>')
    expect(jsonLdMatch).not.toBeNull()

    const structuredData = JSON.parse(jsonLdMatch[1])
    const software = structuredData['@graph'].find((item) => item['@type'] === 'SoftwareApplication')
    expect(software.softwareVersion).toBe('3.1.1')
    expect(software.codeRepository).toBe('https://github.com/turboxing/ChatTransfer')
  })
})
