import { useState, useMemo, useRef } from 'react'
import { parseCSV } from '../lib/csv'

const TEMPLATES = {
  customers: {
    label: 'Customers',
    desc: 'Import your customer master list',
    headers: ['name','email','phone','gstin','address'],
    sample: 'Acme Corp,billing@acme.com,9876543210,29AAACR5055K1Z5,"123 MG Road, Bangalore"',
  },
  vendors: {
    label: 'Vendors',
    desc: 'Import your supplier / vendor list',
    headers: ['name','email','phone','gstin','address'],
    sample: 'Stark Supplies,orders@stark.com,9988776655,27AAACS1234P1Z0,"5 Industrial Ave, Mumbai"',
  },
  products: {
    label: 'Products & Services',
    desc: 'Import goods and services you sell',
    headers: ['name','sku','description','rate','tax','unit','hsnCode'],
    sample: 'Consulting,CONS-01,Strategy consulting,5000,18,hour,998314',
  },
}

const TYPE_ICONS = {
  customers: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z',
  vendors:   'M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v11a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM9 5h6v2H9V5z',
  products:  'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
}

const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)

export default function ImportPage({ headers, toast }) {
  const [type, setType]       = useState('customers')
  const [csv, setCsv]         = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const tpl = TEMPLATES[type]

  // Live preview
  const preview = useMemo(() => {
    if (!csv.trim()) return null
    try {
      const { headers: hdrs, rows } = parseCSV(csv)
      if (!hdrs.length) return null
      return { headers: hdrs, rows: rows.slice(0, 5).map(obj => hdrs.map(h => obj[h] || '')), total: rows.length }
    } catch { return null }
  }, [csv])

  const expectedSet = new Set(tpl.headers.map(h => h.toLowerCase()))
  const missingCols = preview ? tpl.headers.filter(h => !preview.headers.map(x => x.toLowerCase()).includes(h.toLowerCase())) : []

  const run = async (dryRun) => {
    if (!csv.trim()) { toast('Paste or upload a CSV first', 'error'); return }
    setLoading(true); setResult(null)
    const r = await fetch('/api/import/csv', {
      method: 'POST', headers, credentials: 'include',
      body: JSON.stringify({ type, csv, dryRun }),
    })
    const d = await r.json()
    if (!r.ok) { toast(d.error || 'Import failed', 'error'); setLoading(false); return }
    setResult({ ...d, dryRun })
    if (!dryRun) toast(`Imported ${d.created} created, ${d.updated} updated`)
    setLoading(false)
  }

  const readFile = (f) => {
    if (!f) return
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') {
      toast('Please select a .csv file', 'error'); return
    }
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => { setCsv(String(reader.result || '')); setResult(null) }
    reader.readAsText(f)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    readFile(e.dataTransfer.files?.[0])
  }

  const clearFile = () => { setCsv(''); setFileName(''); setResult(null); if (fileRef.current) fileRef.current.value = '' }

  const downloadTemplate = () => {
    const content = tpl.headers.join(',') + '\n' + tpl.sample + '\n'
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${type}-template.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const step = result ? 3 : (csv.trim() ? 2 : 1)

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Bulk Import</h2>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Bring in existing customers, vendors, or products from a CSV. Existing rows are matched by name (case-insensitive) and blank fields are backfilled — we never overwrite your data.
        </div>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {/* Step 1: Choose type */}
      <Section title="1. What are you importing?">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {Object.entries(TEMPLATES).map(([k, t]) => {
            const active = type === k
            return (
              <button key={k} onClick={() => { setType(k); setResult(null) }}
                style={{
                  textAlign: 'left', padding: 14, borderRadius: 'var(--r-md)', cursor: 'pointer',
                  background: active ? 'var(--accent-dim)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border-2)'}`,
                  color: 'var(--text)', fontFamily: 'var(--font)', transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={TYPE_ICONS[k]} size={18}/>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.desc}</div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--r)', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Expected columns:{' '}
            {tpl.headers.map(h => (
              <code key={h} style={{ marginRight: 5, background: 'var(--surface)', padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-2)' }}>{h}</code>
            ))}
          </div>
          <button onClick={downloadTemplate}
            style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--accent-2)', padding: '7px 13px', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/> Download template
          </button>
        </div>
      </Section>

      {/* Step 2: Upload */}
      <Section title="2. Upload your file">
        {!csv.trim() ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-2)'}`,
              background: dragOver ? 'var(--accent-dim)' : 'var(--surface-2)',
              borderRadius: 'var(--r-md)', padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
            <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: '50%', background: 'var(--surface)', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)', marginBottom: 10 }}>
              <Icon d="M7 16a4 4 0 01-.88-7.9A5 5 0 0115.9 6.1 5.5 5.5 0 0119 17h-1m-6-4v8m0-8l-3 3m3-3l3 3" size={24}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Drop your CSV here or click to browse</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Only .csv files, max ~10,000 rows</div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e => readFile(e.target.files?.[0])} style={{ display: 'none' }}/>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-2)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)' }}>
              <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h8M8 9h2" size={18}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'Pasted CSV content'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                {preview ? `${preview.total} row${preview.total === 1 ? '' : 's'} detected` : 'Ready to import'}
                {missingCols.length > 0 && <span style={{ color: 'var(--red-text)', marginLeft: 8 }}>• Missing: {missingCols.join(', ')}</span>}
              </div>
            </div>
            <button onClick={clearFile} style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)', padding: '6px 12px', borderRadius: 'var(--r)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>Clear</button>
          </div>
        )}

        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>Or paste CSV content manually</summary>
          <textarea value={csv} onChange={e => { setCsv(e.target.value); setFileName(''); setResult(null) }} rows={8}
            placeholder={`${tpl.headers.join(',')}\n${tpl.sample}`}
            style={{ width: '100%', marginTop: 8, padding: '10px 13px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)', borderRadius: 'var(--r)', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', resize: 'vertical' }}/>
        </details>
      </Section>

      {/* Preview table */}
      {preview && preview.rows.length > 0 && (
        <Section title="3. Preview" subtitle={`Showing first ${preview.rows.length} of ${preview.total} rows`}>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-2)', borderRadius: 'var(--r)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: 'var(--bg-3)' }}>
                <tr>{preview.headers.map((h, i) => {
                  const known = expectedSet.has(h.toLowerCase())
                  return (
                    <th key={i} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: known ? 'var(--accent-2)' : 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}{!known && <span title="Column not recognized" style={{ marginLeft: 4 }}>•</span>}
                    </th>
                  )
                })}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '8px 12px', color: 'var(--text-2)', fontFamily: 'var(--mono)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell || <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Actions */}
      {csv.trim() && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6, flexWrap: 'wrap' }}>
          <button disabled={loading} onClick={() => run(true)}
            style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)', padding: '10px 18px', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 100-6 3 3 0 000 6z"/> Dry run
          </button>
          <button disabled={loading} onClick={() => run(false)}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {loading ? 'Importing…' : <><Icon d="M5 13l4 4L19 7"/> Import now</>}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ marginTop: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: result.errors?.length ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: result.errors?.length ? 'var(--red-text)' : 'var(--green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={result.errors?.length ? 'M12 9v2m0 4h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' : 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3'} size={20}/>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{result.dryRun ? 'Dry run results' : 'Import complete'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{result.dryRun ? 'No data was written — review and click Import now' : 'Your data has been saved'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
            {[
              { l: 'Total rows', v: result.total, c: 'var(--text)' },
              { l: 'Created',    v: result.created, c: 'var(--green-text)' },
              { l: 'Updated',    v: result.updated, c: 'var(--blue-text)' },
              { l: 'Skipped',    v: result.skipped, c: 'var(--text-3)' },
            ].map(s => (
              <div key={s.l} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r)', padding: 14, border: '1px solid var(--border-2)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.c, fontFamily: 'var(--mono)', marginTop: 4 }}>{s.v}</div>
              </div>
            ))}
          </div>

          {result.errors && result.errors.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red-text)', marginBottom: 8 }}>
                {result.errors.length} error{result.errors.length === 1 ? '' : 's'} — these rows were not imported
              </div>
              <div style={{ maxHeight: 220, overflow: 'auto', background: 'var(--surface-2)', borderRadius: 'var(--r)', padding: 12, border: '1px solid var(--border-2)' }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 5, fontFamily: 'var(--mono)', display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--red-text)', fontWeight: 700, minWidth: 60 }}>Line {e.row}</span>
                    <span>{e.reason}</span>
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

function Stepper({ step }) {
  const steps = ['Choose type', 'Upload file', 'Review & import']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
      {steps.map((s, i) => {
        const n = i + 1
        const done = step > n, active = step === n
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: done ? 'var(--green-text)' : active ? 'var(--accent)' : 'var(--surface-2)',
              color: done || active ? '#fff' : 'var(--text-3)',
              border: `1px solid ${done ? 'var(--green-text)' : active ? 'var(--accent)' : 'var(--border-2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>{done ? '✓' : n}</div>
            <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--text-3)' }}>{s}</div>
            {i < steps.length - 1 && <div style={{ width: 28, height: 1, background: 'var(--border-2)', marginLeft: 4 }}/>}
          </div>
        )
      })}
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}
