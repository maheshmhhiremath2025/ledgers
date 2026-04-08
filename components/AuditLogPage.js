import { useState, useEffect } from 'react'

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
const fmt = (n) => n == null ? '' : '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })

const ACTION_COLORS = {
  create: { bg: 'rgba(16,185,129,0.12)', color: 'var(--green-text)' },
  update: { bg: 'rgba(59,130,246,0.12)',  color: 'var(--blue-text)' },
  delete: { bg: 'rgba(239,68,68,0.12)',   color: 'var(--red-text)' },
  pay:    { bg: 'rgba(99,102,241,0.12)',  color: 'var(--accent-3)' },
  convert:{ bg: 'rgba(245,158,11,0.12)',  color: 'var(--amber-text)' },
}
function actionBadge(action) {
  const verb = action.split('.').pop() || action
  return ACTION_COLORS[verb] || { bg: 'var(--surface-3)', color: 'var(--text-3)' }
}

export default function AuditLogPage({ headers }) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [total, setTotal]     = useState(0)
  const [actions, setActions] = useState([])
  const [filter, setFilter]   = useState({ action: '', entityType: '', search: '', from: '', to: '' })
  const [detail, setDetail]   = useState(null)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), limit: '50' })
    Object.entries(filter).forEach(([k, v]) => { if (v) p.set(k, v) })
    fetch(`/api/audit-log?${p}`, { headers, credentials: 'include' })
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setPages(d.pages || 1); setTotal(d.total || 0); setActions(d.actions || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [page])

  const apply = () => { setPage(1); load() }
  const reset = () => { setFilter({ action:'', entityType:'', search:'', from:'', to:'' }); setPage(1); setTimeout(load, 0) }

  const inp = { padding:'8px 11px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:12, outline:'none', fontFamily:'var(--font)' }

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>Audit Log</h2>
        <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{total.toLocaleString('en-IN')} entries · Every financial action is recorded with actor, timestamp, and before/after snapshot.</div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:14, marginBottom:14, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
        <select value={filter.action} onChange={e => setFilter({ ...filter, action: e.target.value })} style={inp}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={filter.entityType} onChange={e => setFilter({ ...filter, entityType: e.target.value })} style={inp}>
          <option value="">All entities</option>
          {['Invoice','Bill','Estimate','Payment','CreditNote','BankAccount'].map(a => <option key={a}>{a}</option>)}
        </select>
        <input type="date" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} style={inp}/>
        <input type="date" value={filter.to}   onChange={e => setFilter({ ...filter, to:   e.target.value })} style={inp}/>
        <input value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} placeholder="Search ref / email / name" style={{ ...inp, minWidth: 220, flex:1 }}/>
        <button onClick={apply} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'8px 16px', borderRadius:'var(--r)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Apply</button>
        <button onClick={reset} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-3)', padding:'8px 14px', borderRadius:'var(--r)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>Reset</button>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
         : logs.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No audit entries match these filters.</div>
         : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg-3)' }}>
              <tr>
                {['When','User','Action','Entity','Ref','Amount',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => {
                const b = actionBadge(l.action)
                return (
                  <tr key={l._id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-3)', whiteSpace:'nowrap' }}>{fmtDate(l.createdAt)}</td>
                    <td style={{ padding:'10px 14px', fontSize:12 }}>
                      <div style={{ color:'var(--text-2)' }}>{l.userName || '—'}</div>
                      <div style={{ color:'var(--text-4)', fontSize:10 }}>{l.userEmail || ''}</div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background:b.bg, color:b.color, padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, fontFamily:'var(--mono)' }}>{l.action}</span>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>{l.entityType}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', fontWeight:600, fontFamily:'var(--mono)' }}>{l.entityRef || '—'}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', fontFamily:'var(--mono)' }}>{l.amount != null ? fmt(l.amount) : ''}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right' }}>
                      <button onClick={() => setDetail(l)} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:14 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)', padding:'7px 14px', borderRadius:'var(--r)', fontSize:12, cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page > 1 ? 1 : 0.5, fontFamily:'var(--font)' }}>← Prev</button>
          <div style={{ padding:'7px 14px', fontSize:12, color:'var(--text-3)' }}>Page {page} of {pages}</div>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)', padding:'7px 14px', borderRadius:'var(--r)', fontSize:12, cursor: page < pages ? 'pointer' : 'not-allowed', opacity: page < pages ? 1 : 0.5, fontFamily:'var(--font)' }}>Next →</button>
        </div>
      )}

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:9999 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:720, maxHeight:'90vh', overflow:'auto' }}>
            <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{detail.action} · {detail.entityType} {detail.entityRef}</div>
              <button onClick={() => setDetail(null)} style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer', fontFamily:'var(--font)' }}>×</button>
            </div>
            <div style={{ padding:22, fontSize:12, color:'var(--text-2)' }}>
              <div style={{ marginBottom:12 }}><b>When:</b> {fmtDate(detail.createdAt)}</div>
              <div style={{ marginBottom:12 }}><b>By:</b> {detail.userName} &lt;{detail.userEmail}&gt;</div>
              {detail.amount != null && <div style={{ marginBottom:12 }}><b>Amount:</b> {fmt(detail.amount)}</div>}
              {detail.meta?.ip && <div style={{ marginBottom:12 }}><b>IP:</b> <span style={{ fontFamily:'var(--mono)' }}>{detail.meta.ip}</span></div>}
              {detail.meta?.ua && <div style={{ marginBottom:12 }}><b>Agent:</b> <span style={{ fontFamily:'var(--mono)', fontSize:10 }}>{detail.meta.ua}</span></div>}
              {detail.before && <><div style={{ marginTop:14, fontWeight:700, color:'var(--text)' }}>Before</div><pre style={{ background:'var(--surface-2)', padding:12, borderRadius:'var(--r)', overflow:'auto', fontSize:10, marginTop:6, color:'var(--text-2)' }}>{JSON.stringify(detail.before, null, 2)}</pre></>}
              {detail.after  && <><div style={{ marginTop:14, fontWeight:700, color:'var(--text)' }}>After</div><pre style={{ background:'var(--surface-2)', padding:12, borderRadius:'var(--r)', overflow:'auto', fontSize:10, marginTop:6, color:'var(--text-2)' }}>{JSON.stringify(detail.after, null, 2)}</pre></>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
