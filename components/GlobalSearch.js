import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { fmt, fmtDate } from './ui'

const TYPE_META = {
  invoice:  { icon:'📄', color:'#6366F1', label:'Invoice' },
  customer: { icon:'👤', color:'#10B981', label:'Customer' },
  vendor:   { icon:'🏭', color:'#EF4444', label:'Vendor' },
  po:       { icon:'📦', color:'#F59E0B', label:'Purchase Order' },
  payment:  { icon:'💳', color:'#3B82F6', label:'Payment' },
  expense:  { icon:'💸', color:'#8B5CF6', label:'Expense' },
}

export default function GlobalSearch({ headers, onNavigate }) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [sel,     setSel]     = useState(0)
  const inputRef = useRef()
  const debounce = useRef()

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults([]) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    clearTimeout(debounce.current)
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    debounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers })
        const d = await r.json()
        setResults(d.results || [])
        setSel(0)
      } catch {}
      setLoading(false)
    }, 220)
  }, [query])

  const pick = useCallback(result => {
    onNavigate(result.nav)
    setOpen(false); setQuery(''); setResults([])
  }, [onNavigate])

  const handleKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, results.length-1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s-1, 0)) }
    if (e.key === 'Enter' && results[sel]) pick(results[sel])
    if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults([]) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} title="Search (Ctrl+K)"
      style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', cursor:'pointer', fontFamily:'var(--font)', color:'var(--text-3)', fontSize:13, transition:'all 0.15s', minWidth:180 }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--text)'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-2)';e.currentTarget.style.color='var(--text-3)'}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <span>Search…</span>
      <span style={{ marginLeft:'auto', fontSize:11, padding:'2px 6px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:4, fontFamily:'var(--mono)', opacity:0.7 }}>⌘K</span>
    </button>
  )

  return createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:99999, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'12vh' }}
      onClick={e=>{ if(e.target===e.currentTarget){setOpen(false);setQuery('');setResults([])} }}>
      <div className="fade-up" style={{ width:'100%', maxWidth:580, background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-xl)', boxShadow:'0 24px 80px rgba(0,0,0,0.5)', overflow:'hidden' }}>
        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Search invoices, customers, expenses…"
            style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:16, color:'var(--text)', fontFamily:'var(--font)' }}/>
          {loading && <div style={{ width:16, height:16, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite', flexShrink:0 }}/>}
          <kbd style={{ fontSize:11, padding:'2px 7px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:4, color:'var(--text-3)', fontFamily:'var(--mono)', flexShrink:0 }}>ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div style={{ maxHeight:380, overflowY:'auto' }}>
            {results.map((r, i) => {
              const meta = TYPE_META[r.type] || { icon:'📋', color:'#636880', label:r.type }
              return (
                <button key={r.id} onClick={()=>pick(r)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:i===sel?'var(--accent-dim)':'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textAlign:'left', borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                  onMouseEnter={e=>{setSel(i);e.currentTarget.style.background='var(--accent-dim)'}}
                  onMouseLeave={e=>{if(i!==sel)e.currentTarget.style.background='none'}}>
                  <div style={{ width:36, height:36, borderRadius:'var(--r)', background:`${meta.color}18`, border:`1px solid ${meta.color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{meta.icon}</div>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <div style={{ fontSize:13, fontWeight:600, color: i===sel?'var(--accent-2)':'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{r.sub}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {r.value !== undefined && <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:'var(--text)' }}>{fmt(r.value)}</div>}
                    {r.date && <div style={{ fontSize:11, color:'var(--text-3)' }}>{fmtDate(r.date)}</div>}
                    <div style={{ fontSize:10, color:meta.color, fontWeight:600, marginTop:1 }}>{meta.label}</div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text-3)', fontSize:14 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
            No results for "<strong style={{ color:'var(--text-2)' }}>{query}</strong>"
          </div>
        ) : query.length === 0 ? (
          <div style={{ padding:'20px 16px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Search across</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(TYPE_META).map(([k,v])=>(
                <div key={k} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:12, color:'var(--text-2)' }}>
                  <span>{v.icon}</span><span>{v.label}s</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16, fontSize:12, color:'var(--text-4)' }}>↑↓ navigate · Enter to go · Esc to close</div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}