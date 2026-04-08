import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function ApiKeysPage({ headers, toast }) {
  const [keys, setKeys]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey]   = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/api-keys', { headers, credentials:'include' })
      .then(r => r.json()).then(d => { setKeys(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const create = async (name, scopes) => {
    const r = await fetch('/api/api-keys', { method:'POST', headers, credentials:'include', body: JSON.stringify({ name, scopes }) })
    const d = await r.json()
    if (r.ok) { setNewKey(d); setShowForm(false); load() }
    else toast(d.error || 'Failed', 'error')
  }

  const remove = async (k) => {
    if (!confirm(`Revoke ${k.name}? Existing integrations using this key will stop working immediately.`)) return
    const r = await fetch(`/api/api-keys/${k._id}`, { method:'DELETE', headers, credentials:'include' })
    if (r.ok) { toast('Key revoked'); load() } else toast('Failed', 'error')
  }

  const copy = (text) => { navigator.clipboard.writeText(text); toast('Copied to clipboard') }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>API Keys</h2>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Programmatic access to your data via the public REST API. Use these keys with Zapier, Make, or your own integrations.</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New API Key</button>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
         : keys.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No API keys yet. Create one to start using the public API.</div>
         : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg-3)' }}>
              <tr>{['Name','Key prefix','Scopes','Last used','Created',''].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k._id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontWeight:600 }}>{k.name}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{k.prefix}…</td>
                  <td style={{ padding:'12px 16px', fontSize:11 }}>{(k.scopes || []).map(s => <span key={s} style={{ marginRight:6, padding:'2px 8px', background:'var(--accent-dim)', color:'var(--accent-2)', borderRadius:99, fontWeight:600 }}>{s}</span>)}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{k.lastUsedAt ? fmtDate(k.lastUsedAt) : 'Never'}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(k.createdAt)}</td>
                  <td style={{ padding:'12px 16px', textAlign:'right' }}>
                    <button onClick={() => remove(k)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop:24, padding:18, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Quick start</div>
        <pre style={{ background:'var(--surface-2)', padding:12, borderRadius:'var(--r)', fontSize:11, color:'var(--text-2)', overflow:'auto', fontFamily:'var(--mono)' }}>{`curl -X GET https://ledgers.hexalabs.online/api/v1/invoices \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:8 }}>Available endpoints: <code style={{ color:'var(--accent-2)' }}>/api/v1/invoices</code>, <code style={{ color:'var(--accent-2)' }}>/api/v1/customers</code>, <code style={{ color:'var(--accent-2)' }}>/api/v1/products</code>, <code style={{ color:'var(--accent-2)' }}>/api/v1/payments</code></div>
      </div>

      {showForm && <NewKeyForm onCreate={create} onClose={() => setShowForm(false)} />}
      {newKey && <ShowKeyOnce keyData={newKey} onClose={() => setNewKey(null)} onCopy={copy} />}
    </div>
  )
}

function NewKeyForm({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [readEnabled, setRead] = useState(true)
  const [writeEnabled, setWrite] = useState(true)
  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:440, padding:22 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14 }}>New API Key</div>
        <label style={{ fontSize:11, color:'var(--text-3)' }}>Key name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Zapier integration" autoFocus
          style={{ width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, marginBottom:14, marginTop:4, outline:'none', fontFamily:'var(--font)' }}/>
        <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:8 }}>Scopes</div>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-2)', marginBottom:6 }}>
          <input type="checkbox" checked={readEnabled} onChange={e => setRead(e.target.checked)}/> Read — list and fetch records
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-2)', marginBottom:14 }}>
          <input type="checkbox" checked={writeEnabled} onChange={e => setWrite(e.target.checked)}/> Write — create and modify records
        </label>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={() => name && onCreate(name, [readEnabled && 'read', writeEnabled && 'write'].filter(Boolean))}
            disabled={!name || (!readEnabled && !writeEnabled)}
            style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>Generate Key</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ShowKeyOnce({ keyData, onClose, onCopy }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--accent)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:560, padding:24 }}>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--accent-2)', marginBottom:6 }}>🔑 Your new API Key</div>
        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:14 }}>Copy this key now — it will <b>not be shown again</b>. If you lose it, you'll need to revoke it and create a new one.</div>
        <div style={{ background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', padding:14, marginBottom:14, wordBreak:'break-all', fontFamily:'var(--mono)', fontSize:13, color:'var(--text)' }}>{keyData.key}</div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={() => onCopy(keyData.key)} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>📋 Copy key</button>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>I've saved it</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
