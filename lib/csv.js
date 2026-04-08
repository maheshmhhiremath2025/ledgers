// Minimal RFC 4180-ish CSV parser that handles quoted fields, commas, and embedded newlines.
// Returns { headers: string[], rows: Record<string,string>[] }
export function parseCSV(text) {
  if (!text) return { headers: [], rows: [] }
  // Normalise BOM and line endings
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')

  const records = []
  let cur = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { cur.push(field); field = '' }
      else if (c === '\n') { cur.push(field); field = ''; records.push(cur); cur = [] }
      else field += c
    }
  }
  if (field !== '' || cur.length) { cur.push(field); records.push(cur) }

  const nonEmpty = records.filter(r => r.some(v => (v || '').trim() !== ''))
  if (nonEmpty.length === 0) return { headers: [], rows: [] }

  const headers = nonEmpty[0].map(h => (h || '').trim())
  const rows = nonEmpty.slice(1).map(r => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
  return { headers, rows }
}
