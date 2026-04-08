import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

const ALL_EVENTS = ['invoice.created','invoice.updated','payment.received','payment.made','customer.created','bill.created']

export default function WebhooksPage({ headers, toast }) {
  const [hooks, setHooks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/webhooks', { headers, credentials:'include' })
      .then(r => r.json()).then(d => { setHooks(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const remove = async (h) => {
    if (!confirm(`Delete webhook for ${h.url}?`)) return
    const r = await fetch(`/api/webhooks/${h._id}`, { method:'DELETE', headers, credentials:'include' })
    if (r.ok) { toast('Deleted'); load() } else toast('Failed', 'error')
  }

  const toggle = async (h) => {
    const r = await fetch(`/api/webhooks/${h._id}`, { method:'PUT', headers, credentials:'include', body: JSON.stringify({ active: !h.active }) })
    if (r.ok) load()
  }

  const copy = (text) => { navigator.clipboard.writeText(text); toast('Copied') }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>Webhooks</h2>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Push HTTP notifications to your endpoints when key events happen. Each delivery includes an HMAC-SHA256 signature in <code style={{ color:'var(--accent-2)' }}>X-HexaLabs-Signature</code>.</div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New Webhook</button>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
         : hooks.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No webhooks configured yet.</div>
         : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg-3)' }}>
              <tr>{['URL','Events','Last delivery','Status','Failures',''].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {hooks.map(h => (
                <tr key={h._id} style={{ borderBottom:'1px solid var(--border)', opacity: h.active ? 1 : 0.5 }}>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text)', fontFamily:'var(--mono)', maxWidth:300, overflow:'hidden', textOverflow:'ellipsis' }}>{h.url}</td>
                  <td style={{ padding:'12px 16px', fontSize:11 }}>{(h.events || []).slice(0,3).map(e => <span key={e} style={{ marginRight:5, padding:'2px 7px', background:'var(--accent-dim)', color:'var(--accent-2)', borderRadius:99, fontWeight:600 }}>{e}</span>)}{h.events?.length > 3 ? <span style={{ color:'var(--text-4)' }}>+{h.events.length - 3}</span> : ''}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(h.lastDeliveryAt)}</td>
                  <td style={{ padding:'12px 16px', fontSize:12 }}>
                    {h.lastStatus ? <span style={{ color: h.lastStatus < 300 ? 'var(--green-text)' : 'var(--red-text)', fontFamily:'var(--mono)' }}>{h.lastStatus}</span> : '—'}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color: h.consecutiveFailures > 0 ? 'var(--red-text)' : 'var(--text-3)' }}>{h.consecutiveFailures || 0}</td>
                  <td style={{ padding:'12px 16px', textAlign:'right' }}>
                    <button onClick={() => copy(h.secret)} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>📋 Secret</button>
                    <button onClick={() => toggle(h)} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>{h.active ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => remove(h)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <WebhookForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} headers={headers} toast={toast} editing={editing} />}
    </div>
  )
}

function WebhookForm({ headers, toast, onClose, onSaved, editing }) {
  const [url, setUrl]       = useState(editing?.url || '')
  const [events, setEvents] = useState(editing?.events || ['*'])
  const [allEvents, setAllEvents] = useState(events.includes('*'))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!url.match(/^https?:\/\//)) { toast('Valid URL required', 'error'); return }
    setSaving(true)
    const body = { url, events: allEvents ? ['*'] : events }
    const r = await fetch('/api/webhooks', { method:'POST', headers, credentials:'include', body: JSON.stringify(body) })
    const d = await r.json()
    if (r.ok) { toast('Webhook created'); onSaved() }
    else toast(d.error || 'Failed', 'error')
    setSaving(false)
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:520, padding:22 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14 }}>New Webhook</div>
        <label style={{ fontSize:11, color:'var(--text-3)' }}>Endpoint URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.example.com/your-endpoint" autoFocus
          style={{ width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, marginBottom:14, marginTop:4, outline:'none', fontFamily:'var(--font)' }}/>
        <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:8 }}>Events</div>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-2)', marginBottom:8 }}>
          <input type="checkbox" checked={allEvents} onChange={e => setAllEvents(e.target.checked)}/> All events
        </label>
        {!allEvents && (
          <div style={{ paddingLeft:24, marginBottom:12, maxHeight:140, overflowY:'auto' }}>
            {['invoice.created','invoice.updated','payment.received','payment.made','customer.created','bill.created'].map(ev => (
              <label key={ev} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-2)', marginBottom:4 }}>
                <input type="checkbox" checked={events.includes(ev)} onChange={e => setEvents(prev => e.target.checked ? [...prev.filter(x => x !== '*'), ev] : prev.filter(x => x !== ev))}/>
                <code style={{ fontFamily:'var(--mono)' }}>{ev}</code>
              </label>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{saving ? 'Saving…' : 'Create Webhook'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
