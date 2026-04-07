import { useState, useEffect } from 'react'
import Head from 'next/head'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const PC = {
  starter:      { bg: 'rgba(158,163,191,0.15)', color: '#9EA3BF' },
  professional: { bg: 'rgba(59,130,246,0.15)',  color: '#3B82F6' },
  business:     { bg: 'rgba(99,102,241,0.15)',  color: '#6366F1' },
}

const card = { background:'#151828', border:'1px solid #262A3D', borderRadius:10, padding:16 }
const btn  = { background:'#6366F1', color:'#fff', border:'none', padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }
const btnGhost = { background:'transparent', color:'#9EA3BF', border:'1px solid #262A3D', padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }
const th = { textAlign:'left', padding:'10px 12px', fontSize:11, fontWeight:700, color:'#9EA3BF', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #262A3D' }
const td = { padding:'11px 12px', fontSize:13, color:'#E5E7F0', borderBottom:'1px solid #1E2133' }

export default function SuperAdminPage() {
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [orgs, setOrgs]         = useState([])
  const [totals, setTotals]     = useState({ totalOrgs: 0, totalUsers: 0 })
  const [query, setQuery]       = useState('')
  const [planFilter, setPlan]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDL]  = useState(false)
  const [tab, setTab]           = useState('overview')

  const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : null
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

  useEffect(() => {
    fetch('/api/superadmin/orgs', { credentials: 'include', headers })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setError(d.error || 'Access denied'); setLoading(false); return }
        setOrgs(d.orgs || [])
        setTotals({ totalOrgs: d.totalOrgs, totalUsers: d.totalUsers })
        setLoading(false)
      })
      .catch(() => { setError('Failed to load'); setLoading(false) })
  }, [])

  const openOrg = async (orgId) => {
    setSelected(orgId); setDL(true); setDetail(null); setTab('overview')
    const r = await fetch(`/api/superadmin/orgs/${encodeURIComponent(orgId)}`, { credentials: 'include', headers })
    const d = await r.json()
    setDetail(d); setDL(false)
  }

  const filtered = orgs.filter(o => {
    if (planFilter !== 'all' && o.plan !== planFilter) return false
    if (query) {
      const q = query.toLowerCase()
      return (o.businessName || '').toLowerCase().includes(q) ||
             (o.adminEmail   || '').toLowerCase().includes(q) ||
             (o.adminName    || '').toLowerCase().includes(q) ||
             (o.orgId        || '').toLowerCase().includes(q)
    }
    return true
  })

  const totalRevenue = orgs.reduce((s, o) => s + (o.paymentTotal || 0), 0)
  const totalInvoiced = orgs.reduce((s, o) => s + (o.invoiceTotal || 0), 0)

  if (loading) return <Shell><div style={{ color:'#9EA3BF' }}>Loading…</div></Shell>
  if (error)   return <Shell><div style={{ color:'#EF4444', padding:20, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10 }}>{error}</div></Shell>

  return (
    <Shell>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <Stat label="Total Orgs"      value={totals.totalOrgs} />
        <Stat label="Total Users"     value={totals.totalUsers} />
        <Stat label="Total Invoiced"  value={fmt(totalInvoiced)} />
        <Stat label="Total Collected" value={fmt(totalRevenue)} />
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <input placeholder="Search by name, email, orgId…" value={query} onChange={e => setQuery(e.target.value)}
          style={{ flex:1, minWidth:260, background:'#0F111C', border:'1px solid #262A3D', color:'#E5E7F0', padding:'10px 14px', borderRadius:8, fontSize:13, outline:'none' }} />
        <select value={planFilter} onChange={e => setPlan(e.target.value)}
          style={{ background:'#0F111C', border:'1px solid #262A3D', color:'#E5E7F0', padding:'10px 14px', borderRadius:8, fontSize:13, outline:'none' }}>
          <option value="all">All plans</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Orgs table */}
      <div style={{ ...card, padding:0, overflow:'hidden', marginBottom:20 }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1100 }}>
            <thead style={{ background:'#0F111C' }}>
              <tr>
                <th style={th}>Business</th>
                <th style={th}>Admin</th>
                <th style={th}>Plan</th>
                <th style={th}>Users</th>
                <th style={th}>Invoices</th>
                <th style={th}>POs</th>
                <th style={th}>Collected</th>
                <th style={th}>Joined</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const pc = PC[o.plan] || PC.starter
                return (
                  <tr key={o.orgId}>
                    <td style={td}>
                      <div style={{ fontWeight:600 }}>{o.businessName}</div>
                      <div style={{ fontSize:11, color:'#6B7080', fontFamily:'monospace' }}>{o.orgId}</div>
                    </td>
                    <td style={td}>
                      <div>{o.adminName}</div>
                      <div style={{ fontSize:11, color:'#9EA3BF' }}>{o.adminEmail}</div>
                    </td>
                    <td style={td}>
                      <span style={{ background:pc.bg, color:pc.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, textTransform:'uppercase' }}>{o.plan}</span>
                    </td>
                    <td style={td}>{o.userCount}</td>
                    <td style={td}>{o.invoiceCount} <span style={{ color:'#6B7080', fontSize:11 }}>({fmt(o.invoiceTotal)})</span></td>
                    <td style={td}>{o.poCount}</td>
                    <td style={td}>{fmt(o.paymentTotal)}</td>
                    <td style={td}>{fmtDate(o.createdAt)}</td>
                    <td style={td}><button onClick={() => openOrg(o.orgId)} style={btnGhost}>View</button></td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ ...td, textAlign:'center', color:'#6B7080', padding:40 }}>No orgs match</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down modal */}
      {selected && (
        <div onClick={() => { setSelected(null); setDetail(null) }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:100, padding:'30px 20px', overflow:'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#0B0D18', border:'1px solid #262A3D', borderRadius:12, width:'100%', maxWidth:1200, maxHeight:'90vh', overflow:'auto' }}>
            <div style={{ padding:'18px 24px', borderBottom:'1px solid #262A3D', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#0B0D18', zIndex:1 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:'#E5E7F0' }}>{detail?.config?.businessName || 'Loading…'}</div>
                <div style={{ fontSize:11, color:'#6B7080', fontFamily:'monospace' }}>{selected}</div>
              </div>
              <button onClick={() => { setSelected(null); setDetail(null) }} style={{ ...btnGhost, padding:'6px 12px' }}>✕ Close</button>
            </div>

            {detailLoading && <div style={{ padding:40, color:'#9EA3BF', textAlign:'center' }}>Loading org data…</div>}

            {detail && (
              <>
                <div style={{ padding:'0 24px', borderBottom:'1px solid #262A3D', display:'flex', gap:2, overflowX:'auto' }}>
                  {['overview','config','users','invoices','pos','expenses','payments','creditNotes','customers','vendors','products','accounts','journals','recurring'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      style={{ background:'none', border:'none', color: tab===t ? '#6366F1' : '#9EA3BF', padding:'14px 14px', fontSize:12, fontWeight:600, cursor:'pointer', borderBottom: tab===t ? '2px solid #6366F1' : '2px solid transparent', textTransform:'capitalize', whiteSpace:'nowrap' }}>
                      {t === 'pos' ? 'POs' : t === 'creditNotes' ? 'Credit Notes' : t}
                    </button>
                  ))}
                </div>

                <div style={{ padding:24 }}>
                  {tab === 'overview' && <Overview detail={detail} />}
                  {tab === 'config'   && <PreJson data={detail.config} />}
                  {tab === 'users'    && <SimpleTable rows={detail.users} cols={['name','email','role','status','plan','createdAt']} />}
                  {tab === 'invoices' && <SimpleTable rows={detail.invoices} cols={['invoiceNumber','customer.name','issueDate','dueDate','total','status']} />}
                  {tab === 'pos'      && <SimpleTable rows={detail.pos} cols={['poNumber','vendor.name','issueDate','total','status']} />}
                  {tab === 'expenses' && <SimpleTable rows={detail.expenses} cols={['date','category','vendor','amount','notes']} />}
                  {tab === 'payments' && <SimpleTable rows={detail.payments} cols={['date','method','amount','reference','invoiceNumber']} />}
                  {tab === 'creditNotes' && <SimpleTable rows={detail.creditNotes} cols={['creditNoteNumber','invoiceNumber','date','amount','reason']} />}
                  {tab === 'customers' && <SimpleTable rows={detail.customers} cols={['name','email','phone','gstin','address']} />}
                  {tab === 'vendors'  && <SimpleTable rows={detail.vendors} cols={['name','email','phone','gstin']} />}
                  {tab === 'products' && <SimpleTable rows={detail.products} cols={['name','sku','rate','tax','unit']} />}
                  {tab === 'accounts' && <SimpleTable rows={detail.accounts} cols={['code','name','type','balance']} />}
                  {tab === 'journals' && <SimpleTable rows={detail.journals} cols={['date','refType','refNumber','narration','debit','credit']} />}
                  {tab === 'recurring' && <SimpleTable rows={detail.recurring} cols={['customer.name','frequency','nextDate','amount','active']} />}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <>
      <Head><title>SuperAdmin · HexaLabs Books</title></Head>
      <div style={{ minHeight:'100vh', background:'#0B0D18', color:'#E5E7F0', padding:'30px 40px', fontFamily:'-apple-system,Segoe UI,sans-serif' }}>
        <div style={{ maxWidth:1400, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#F59E0B', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>⚡ Internal · HexaLabs</div>
              <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px', margin:0 }}>SuperAdmin Dashboard</h1>
            </div>
            <a href="/app" style={{ ...btnGhost, textDecoration:'none' }}>← Back to App</a>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div style={card}>
      <div style={{ fontSize:11, color:'#9EA3BF', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:'#E5E7F0' }}>{value}</div>
    </div>
  )
}

function Overview({ detail }) {
  const cfg = detail.config || {}
  const counts = [
    ['Users',        detail.users.length],
    ['Invoices',     detail.invoices.length],
    ['POs',          detail.pos.length],
    ['Expenses',     detail.expenses.length],
    ['Payments',     detail.payments.length],
    ['Credit Notes', detail.creditNotes.length],
    ['Customers',    detail.customers.length],
    ['Vendors',      detail.vendors.length],
    ['Products',     detail.products.length],
    ['Accounts',     detail.accounts.length],
    ['Journals',     detail.journals.length],
    ['Recurring',    detail.recurring.length],
  ]
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {counts.map(([l,v]) => (
          <div key={l} style={{ background:'#151828', border:'1px solid #262A3D', borderRadius:8, padding:12 }}>
            <div style={{ fontSize:10, color:'#9EA3BF', textTransform:'uppercase', fontWeight:600 }}>{l}</div>
            <div style={{ fontSize:20, fontWeight:700, marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:13, color:'#9EA3BF', marginBottom:8, fontWeight:600 }}>Business Info</div>
      <div style={{ background:'#151828', border:'1px solid #262A3D', borderRadius:8, padding:16, fontSize:13, lineHeight:1.8 }}>
        <div><b style={{ color:'#9EA3BF' }}>Name:</b> {cfg.businessName || '—'}</div>
        <div><b style={{ color:'#9EA3BF' }}>Email:</b> {cfg.businessEmail || '—'}</div>
        <div><b style={{ color:'#9EA3BF' }}>Phone:</b> {cfg.businessPhone || '—'}</div>
        <div><b style={{ color:'#9EA3BF' }}>GSTIN:</b> {cfg.gstin || '—'}</div>
        <div><b style={{ color:'#9EA3BF' }}>PAN:</b> {cfg.pan || '—'}</div>
        <div><b style={{ color:'#9EA3BF' }}>Address:</b> {cfg.businessAddress || '—'}</div>
      </div>
    </div>
  )
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
}

function SimpleTable({ rows, cols }) {
  if (!rows || rows.length === 0) return <div style={{ color:'#6B7080', padding:20, textAlign:'center' }}>No records</div>
  return (
    <div style={{ overflowX:'auto', border:'1px solid #262A3D', borderRadius:8 }}>
      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
        <thead style={{ background:'#0F111C' }}>
          <tr>{cols.map(c => <th key={c} style={th}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, 200).map((r, i) => (
            <tr key={r._id || i}>
              {cols.map(c => {
                let v = getPath(r, c)
                if (v == null) v = '—'
                else if (c.toLowerCase().includes('date') || c === 'createdAt') v = fmtDate(v)
                else if (['amount','total','balance','rate','debit','credit'].includes(c)) v = fmt(v)
                else if (typeof v === 'boolean') v = v ? '✓' : '✕'
                else if (typeof v === 'object') v = JSON.stringify(v).slice(0, 60)
                return <td key={c} style={td}>{String(v)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 200 && <div style={{ padding:10, textAlign:'center', fontSize:11, color:'#6B7080' }}>Showing first 200 of {rows.length}</div>}
    </div>
  )
}

function PreJson({ data }) {
  return <pre style={{ background:'#0F111C', border:'1px solid #262A3D', borderRadius:8, padding:16, color:'#E5E7F0', fontSize:12, overflow:'auto', maxHeight:'60vh' }}>{JSON.stringify(data, null, 2)}</pre>
}
