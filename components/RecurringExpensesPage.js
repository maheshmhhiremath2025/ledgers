import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

export default function RecurringExpensesPage({ headers, toast, readOnly }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/recurring-expenses', { headers, credentials:'include' })
      .then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const remove = async (i) => {
    if (!confirm(`Delete recurring expense "${i.name}"?`)) return
    const r = await fetch(`/api/recurring-expenses/${i._id}`, { method:'DELETE', headers, credentials:'include' })
    if (r.ok) { toast('Deleted'); load() } else toast('Failed', 'error')
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>Recurring Expenses</h2>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{items.length} schedules · runs daily via cron</div>
        </div>
        {!readOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New Schedule</button>
        )}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
         : items.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No recurring expenses set up yet.</div>
         : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg-3)' }}>
              <tr>{['Name','Vendor','Frequency','Amount','Next run','Generated',''].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i._id} style={{ borderBottom:'1px solid var(--border)', opacity: i.active ? 1 : 0.5 }}>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontWeight:600 }}>{i.name}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-2)' }}>{i.vendor || '—'}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)', textTransform:'capitalize' }}>{i.frequency}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(i.amount)}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(i.nextDate)}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{i.generatedCount || 0}</td>
                  <td style={{ padding:'12px 16px', textAlign:'right' }}>
                    {!readOnly && (
                      <>
                        <button onClick={() => { setEditing(i); setShowForm(true) }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>Edit</button>
                        <button onClick={() => remove(i)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <RecExpForm editing={editing} headers={headers} toast={toast} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function RecExpForm({ editing, headers, toast, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        editing?.name || '',
    category:    editing?.category || 'Miscellaneous',
    vendor:      editing?.vendor || '',
    description: editing?.description || '',
    amount:      editing?.amount || '',
    tax:         editing?.tax || 0,
    paymentMode: editing?.paymentMode || 'Bank Transfer',
    frequency:   editing?.frequency || 'monthly',
    startDate:   editing?.startDate ? new Date(editing.startDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    nextDate:    editing?.nextDate ? new Date(editing.nextDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    endDate:     editing?.endDate ? new Date(editing.endDate).toISOString().slice(0,10) : '',
    active:      editing?.active !== false,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name || !form.amount) { toast('Name and amount required', 'error'); return }
    setSaving(true)
    const url = editing ? `/api/recurring-expenses/${editing._id}` : '/api/recurring-expenses'
    const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers, credentials:'include', body: JSON.stringify({ ...form, amount: Number(form.amount), tax: Number(form.tax) || 0 }) })
    if (r.ok) { toast(editing ? 'Updated' : 'Created'); onSaved() }
    else { const d = await r.json(); toast(d.error || 'Failed', 'error') }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', padding:22 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14 }}>{editing ? 'Edit Recurring Expense' : 'New Recurring Expense'}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, color:'var(--text-3)' }}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office rent, AWS bill" style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Category</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Vendor</label><input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Amount *</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>GST %</label><input type="number" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Frequency</label>
            <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} style={inp}>
              {['weekly','monthly','quarterly','yearly'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Payment mode</label>
            <select value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })} style={inp}>
              {['Bank Transfer','Cash','UPI','Cheque','Card','Other'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Start date</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value, nextDate: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>End date (optional)</label><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inp}/></div>
          <div style={{ gridColumn:'1 / -1' }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-2)' }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}/> Active
            </label>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{saving ? 'Saving…' : '💾 Save'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
