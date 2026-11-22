export function decodePreview(buffer, encoding = 'auto', truncated = false) {
  const bytes = new Uint8Array(buffer)
  const detected = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8'
  const selected = encoding === 'auto' ? detected : encoding
  if (!selected.startsWith('utf-16') && bytes.slice(0, 8192).includes(0)) throw new Error('binary')
  const decoder = new TextDecoder(selected)
  const content = decoder.decode(bytes, { stream: truncated })
  const sample = content.slice(0, 8192)
  const controls = sample.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) || []
  if (controls.length > Math.max(2, sample.length / 100)) throw new Error('binary')
  return content
}

export function searchPreview(content, query, limit = 500) {
  if (!query) return []
  const matches = []
  let offset = 0
  while (matches.length < limit) {
    const index = content.indexOf(query, offset)
    if (index < 0) break
    matches.push(index)
    offset = index + query.length
  }
  return matches
}
