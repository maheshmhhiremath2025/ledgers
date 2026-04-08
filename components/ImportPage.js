import { useState } from 'react'

const TEMPLATES = {
  customers: { headers: ['name','email','phone','gstin','address'], sample: 'Acme Corp,billing@acme.com,9876543210,29AAACR5055K1Z5,"123 MG Road, Bangalore"' },
  vendors:   { headers: ['name','email','phone','gstin','address'], sample: 'Stark Supplies,orders@stark.com,9988776655,27AAACS1234P1Z0,"5 Industrial Ave, Mumbai"' },
  products:  { headers: ['name','sku','description','rate','tax','unit','hsnCode'], sample: 'Consulting,CONS-01,Strategy consulting,5000,18,hour,998314' },
}

export default function ImportPage({ headers, toast }) {
  const [type, setType]       = useState('customers')
  const [csv, setCsv]         = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  const tpl = TEMPLATES[type]

  const run = async (dryRun) => {
    if (!csv.trim()) { toast('Paste or upload CSV first', 'error'); return }
    setLoading(true); setResult(null)
    const r = await fetch('/api/import/csv', {
      method: 'POST', headers, credentials: 'include',
      body: JSON.stringify({ type, csv, dryRun }),
    })
    const d = await r.json()
    if (!r.ok) { toast(d.error || 'Import failed', 'error'); setLoading(false); return }
    setResult(d)
    if (!dryRun) toast(`✓ Imported ${d.created} created, ${d.updated} updated`)
    setLoading(false)
  }

  const onFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setCsv(String(reader.result || ''))
    reader.readAsText(f)
  }

  const downloadTemplate = () => {
    const content = tpl.headers.join(',') + '\n' + tpl.sample + '\n'
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${type}-template.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const inp = { width:'100%', padding:'10px 13px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>Bulk Import (CSV)</h2>
        <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Bring in your existing customers, vendors, or products from a spreadsheet. Existing rows are matched by name (case-insensitive) and backfilled only on blank fields — never overwritten.</div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:20, marginBottom:14 }}>
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>Import:</label>
          <select value={type} onChange={e => { setType(e.target.value); setResult(null) }} style={{ ...inp, width:'auto' }}>
            <option value="customers">Customers</option>
            <option value="vendors">Vendors</option>
            <option value="products">Products</option>
          </select>
          <button onClick={downloadTemplate} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--accent-2)', padding:'8px 14px', borderRadius:'var(--r)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>📥 Download template</button>
        </div>

        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:6 }}>
          Expected columns: <code style={{ background:'var(--surface-2)', padding:'2px 6px', borderRadius:4, fontFamily:'var(--mono)', fontSize:11, color:'var(--accent-2)' }}>{tpl.headers.join(', ')}</code>
        </div>

        <div style={{ marginBottom:14 }}>
          <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize:12, color:'var(--text-2)' }}/>
        </div>

        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:6 }}>Or paste CSV content</label>
          <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={10} placeholder={`${tpl.headers.join(',')}\n${tpl.sample}`} style={{ ...inp, resize:'vertical', fontFamily:'var(--mono)', fontSize:12, minHeight: 200 }}/>
        </div>

        <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'flex-end' }}>
          <button disabled={loading} onClick={() => run(true)}  style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', fontSize:13, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'var(--font)' }}>🔍 Dry run (preview)</button>
          <button disabled={loading} onClick={() => run(false)} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 20px', borderRadius:'var(--r)', fontSize:13, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'var(--font)' }}>{loading ? 'Importing…' : '✓ Import now'}</button>
        </div>
      </div>

      {result && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>Result</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
            {[
              { l:'Total rows', v: result.total, c: 'var(--text)' },
              { l:'Created',    v: result.created, c: 'var(--green-text)' },
              { l:'Updated',    v: result.updated, c: 'var(--blue-text)' },
              { l:'Skipped',    v: result.skipped, c: 'var(--text-3)' },
            ].map(s => (
              <div key={s.l} style={{ background:'var(--surface-2)', borderRadius:'var(--r)', padding:12 }}>
                <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase' }}>{s.l}</div>
                <div style={{ fontSize:22, fontWeight:700, color: s.c, fontFamily:'var(--mono)' }}>{s.v}</div>
              </div>
            ))}
          </div>
          {result.errors && result.errors.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--red-text)', marginBottom:8 }}>{result.errors.length} error{result.errors.length === 1 ? '' : 's'}</div>
              <div style={{ maxHeight:200, overflow:'auto', background:'var(--surface-2)', borderRadius:'var(--r)', padding:10 }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize:11, color:'var(--text-3)', marginBottom:4, fontFamily:'var(--mono)' }}>
                    Line {e.row}: {e.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
