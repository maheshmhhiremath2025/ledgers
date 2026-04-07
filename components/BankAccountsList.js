import { useState, useEffect } from 'react'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })

export default function BankAccountsList({ headers, toast, readOnly }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/bank-accounts', { headers, credentials: 'include' })
      .then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const remove = async (a) => {
    if (!confirm(`Delete ${a.name}?`)) return
    const r = await fetch(`/api/bank-accounts/${a._id}`, { method: 'DELETE', headers, credentials: 'include' })
    if (r.ok) { toast('Deleted'); load() } else toast('Failed', 'error')
  }

  const totalBalance = items.filter(a => a.active).reduce((s, a) => s + (a.currentBalance || 0), 0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin:0 }}>Bank & Cash Accounts</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{items.length} accounts · Total balance: <b>{fmt(totalBalance)}</b></div>
        </div>
        {!readOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New Account</button>
        )}
      </div>

      {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
       : items.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)' }}>No bank or cash accounts yet. Add one to start tracking balances.</div>
       : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {items.map(a => (
            <div key={a._id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:18, opacity: a.active ? 1 : 0.5 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--accent-2)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{a.type || 'Bank'}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginTop:2 }}>{a.name}</div>
                </div>
                {!readOnly && (
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={() => { setEditing(a); setShowForm(true) }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-3)', padding:'3px 8px', borderRadius:5, fontSize:10, cursor:'pointer', fontFamily:'var(--font)' }}>Edit</button>
                    <button onClick={() => remove(a)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'3px 8px', borderRadius:5, fontSize:10, cursor:'pointer', fontFamily:'var(--font)' }}>×</button>
                  </div>
                )}
              </div>
              {a.bankName && <div style={{ fontSize:12, color:'var(--text-3)' }}>{a.bankName}</div>}
              {a.accountNumber && <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)' }}>•••• {a.accountNumber.slice(-4)}</div>}
              {a.ifsc && <div style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)' }}>IFSC: {a.ifsc}</div>}
              <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>Current balance</div>
                <div style={{ fontSize:22, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(a.currentBalance)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <BankForm editing={editing} headers={headers} toast={toast} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function BankForm({ editing, headers, toast, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editing?.name || '', bankName: editing?.bankName || '', accountNumber: editing?.accountNumber || '',
    ifsc: editing?.ifsc || '', branch: editing?.branch || '', type: editing?.type || 'Bank',
    openingBalance: editing?.openingBalance ?? 0, currentBalance: editing?.currentBalance ?? 0,
    active: editing?.active !== false, notes: editing?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name) { toast('Name required', 'error'); return }
    setSaving(true)
    const url = editing ? `/api/bank-accounts/${editing._id}` : '/api/bank-accounts'
    const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers, credentials:'include', body: JSON.stringify(form) })
    if (r.ok) { toast(editing ? '✓ Updated' : '✓ Account added'); onSaved() }
    else { const d = await r.json(); toast(d.error || 'Failed', 'error') }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{editing ? 'Edit Account' : 'New Bank/Cash Account'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer', fontFamily:'var(--font)' }}>×</button>
        </div>
        <div style={{ padding:22, display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Account name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="HDFC Current" style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inp}>
              <option value="Bank">Bank</option><option value="Cash">Cash</option><option value="CreditCard">Credit Card</option>
            </select>
          </div>
          {form.type === 'Bank' && <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Bank name</label><input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} style={inp}/></div>
              <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Branch</label><input value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} style={inp}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Account number</label><input value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} style={inp}/></div>
              <div><label style={{ fontSize:11, color:'var(--text-3)' }}>IFSC</label><input value={form.ifsc} onChange={e => setForm({ ...form, ifsc: e.target.value })} style={inp}/></div>
            </div>
          </>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Opening balance</label><input type="number" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: Number(e.target.value), currentBalance: editing ? form.currentBalance : Number(e.target.value) })} style={inp}/></div>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Current balance</label><input type="number" value={form.currentBalance} onChange={e => setForm({ ...form, currentBalance: Number(e.target.value) })} style={inp}/></div>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-2)' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}/>
            Active
          </label>
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'8px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'8px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{saving ? 'Saving…' : '💾 Save'}</button>
        </div>
      </div>
    </div>
  )
}
