import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

export default function ProjectsPage({ headers, toast, readOnly }) {
  const [projects, setProjects] = useState([])
  const [entries, setEntries]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showProjectForm, setShowPF] = useState(false)
  const [showEntryForm, setShowEF]   = useState(false)
  const [editingProject, setEP] = useState(null)
  const [selectedProject, setSP] = useState(null) // for filter

  const load = async () => {
    setLoading(true)
    const [pr, er] = await Promise.all([
      fetch('/api/projects', { headers, credentials:'include' }).then(r => r.json()),
      fetch('/api/time-entries', { headers, credentials:'include' }).then(r => r.json()),
    ])
    setProjects(Array.isArray(pr) ? pr : [])
    setEntries(Array.isArray(er) ? er : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const removeProject = async (p) => {
    if (!confirm(`Delete project "${p.name}"? Existing time entries will not be deleted.`)) return
    const r = await fetch(`/api/projects/${p._id}`, { method:'DELETE', headers, credentials:'include' })
    if (r.ok) { toast('Deleted'); load() }
  }

  const invoiceTime = async (p) => {
    const taxStr = prompt(`Generate invoice from unbilled time on "${p.name}"?\n\nGST % to apply (e.g. 18, or 0 for none):`, '18')
    if (taxStr == null) return
    const r = await fetch(`/api/projects/${p._id}/invoice-time`, { method:'POST', headers, credentials:'include', body: JSON.stringify({ taxPct: Number(taxStr) || 0 }) })
    const d = await r.json()
    if (r.ok) { toast(`✓ Invoice ${d.invoice.invoiceNumber} created from ${d.entriesCount} entries`); load() }
    else toast(d.error || 'Failed', 'error')
  }

  const projectEntries = (pid) => entries.filter(e => e.projectId === pid)
  const projectHours   = (pid) => projectEntries(pid).reduce((s, e) => s + Number(e.hours || 0), 0)
  const projectUnbilled= (pid) => projectEntries(pid).filter(e => e.billable && !e.invoicedAt).reduce((s, e) => s + Number(e.hours || 0) * Number(e.hourlyRate || 0), 0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>Projects & Time Tracking</h2>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{projects.length} projects · {entries.length} time entries</div>
        </div>
        {!readOnly && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setShowEF(true) }} style={{ background:'transparent', border:'1px solid var(--accent)', color:'var(--accent-2)', padding:'9px 16px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>⏱ Log Time</button>
            <button onClick={() => { setEP(null); setShowPF(true) }} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New Project</button>
          </div>
        )}
      </div>

      {loading ? <div style={{ padding:40, color:'var(--text-3)' }}>Loading…</div> : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14, marginBottom:24 }}>
            {projects.map(p => {
              const unbilled = projectUnbilled(p._id)
              return (
                <div key={p._id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--accent-2)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{p.status}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginTop:2 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:'var(--text-3)' }}>{p.customer?.name || '—'}</div>
                    </div>
                    {!readOnly && (
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => { setEP(p); setShowPF(true) }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-3)', padding:'3px 8px', borderRadius:5, fontSize:10, cursor:'pointer', fontFamily:'var(--font)' }}>Edit</button>
                        <button onClick={() => removeProject(p)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'3px 8px', borderRadius:5, fontSize:10, cursor:'pointer', fontFamily:'var(--font)' }}>×</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:11, marginTop:14 }}>
                    <div><div style={{ color:'var(--text-3)' }}>Hours logged</div><div style={{ fontSize:16, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{projectHours(p._id).toFixed(1)}</div></div>
                    <div><div style={{ color:'var(--text-3)' }}>Hourly rate</div><div style={{ fontSize:14, color:'var(--text-2)', fontFamily:'var(--mono)' }}>{fmt(p.hourlyRate)}</div></div>
                  </div>
                  <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>Unbilled value</div>
                    <div style={{ fontSize:18, fontWeight:700, color:unbilled > 0 ? 'var(--green-text)' : 'var(--text-4)', fontFamily:'var(--mono)', marginBottom:8 }}>{fmt(unbilled)}</div>
                    {!readOnly && unbilled > 0 && (
                      <button onClick={() => invoiceTime(p)} style={{ width:'100%', background:'var(--accent)', color:'#fff', border:'none', padding:'8px', borderRadius:'var(--r)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>→ Generate Invoice</button>
                    )}
                  </div>
                </div>
              )
            })}
            {projects.length === 0 && <div style={{ gridColumn:'1 / -1', padding:40, textAlign:'center', color:'var(--text-3)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)' }}>No projects yet. Create one to start tracking billable hours.</div>}
          </div>

          {entries.length > 0 && (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', marginBottom:10 }}>Recent time entries</div>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead style={{ background:'var(--bg-3)' }}>
                    <tr>{['Date','Project','Description','Hours','Rate','Total','Status'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 30).map(e => (
                      <tr key={e._id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(e.date)}</td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text-2)' }}>{e.projectName}</td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text-3)' }}>{e.description || '—'}</td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text)', fontFamily:'var(--mono)' }}>{Number(e.hours).toFixed(1)}</td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{fmt(e.hourlyRate)}</td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(Number(e.hours) * Number(e.hourlyRate))}</td>
                        <td style={{ padding:'9px 14px', fontSize:11 }}>
                          {e.invoicedAt ? <span style={{ background:'var(--accent-dim)', color:'var(--accent-2)', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>Invoiced</span>
                            : e.billable ? <span style={{ background:'var(--green-dim)', color:'var(--green-text)', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>Billable</span>
                            : <span style={{ background:'var(--surface-3)', color:'var(--text-3)', padding:'2px 8px', borderRadius:99 }}>Non-billable</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showProjectForm && <ProjectForm editing={editingProject} headers={headers} toast={toast} onClose={() => setShowPF(false)} onSaved={() => { setShowPF(false); load() }} />}
      {showEntryForm   && <TimeEntryForm projects={projects} headers={headers} toast={toast} onClose={() => setShowEF(false)} onSaved={() => { setShowEF(false); load() }} />}
    </div>
  )
}

function ProjectForm({ editing, headers, toast, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        editing?.name || '',
    customerName: editing?.customer?.name || '',
    customerEmail: editing?.customer?.email || '',
    customerGstin: editing?.customer?.gstin || '',
    description: editing?.description || '',
    hourlyRate:  editing?.hourlyRate || 0,
    status:      editing?.status || 'Active',
    budget:      editing?.budget || 0,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name) { toast('Name required', 'error'); return }
    setSaving(true)
    const body = {
      name: form.name,
      customer: { name: form.customerName, email: form.customerEmail, gstin: form.customerGstin },
      description: form.description,
      hourlyRate: Number(form.hourlyRate) || 0,
      status: form.status,
      budget: Number(form.budget) || 0,
    }
    const url = editing ? `/api/projects/${editing._id}` : '/api/projects'
    const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers, credentials:'include', body: JSON.stringify(body) })
    if (r.ok) { toast(editing ? 'Updated' : 'Created'); onSaved() }
    else { const d = await r.json(); toast(d.error || 'Failed', 'error') }
    setSaving(false)
  }
  const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto', padding:22 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14 }}>{editing ? 'Edit Project' : 'New Project'}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, color:'var(--text-3)' }}>Project name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Customer name</label><input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Customer email</label><input value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Customer GSTIN</label><input value={form.customerGstin} onChange={e => setForm({ ...form, customerGstin: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Hourly rate (₹)</label><input type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
              {['Active','Completed','Archived'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Budget (₹)</label><input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} style={inp}/></div>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, color:'var(--text-3)' }}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inp, resize:'vertical' }}/></div>
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

function TimeEntryForm({ projects, headers, toast, onClose, onSaved }) {
  const [form, setForm] = useState({
    projectId:   projects[0]?._id || '',
    date:        new Date().toISOString().slice(0,10),
    hours:       '',
    description: '',
    hourlyRate:  '',
    billable:    true,
  })
  const [saving, setSaving] = useState(false)

  const project = projects.find(p => p._id === form.projectId)

  const save = async () => {
    if (!form.projectId || !form.hours) { toast('Project and hours required', 'error'); return }
    setSaving(true)
    const body = { ...form, hours: Number(form.hours), hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : (project?.hourlyRate || 0) }
    const r = await fetch('/api/time-entries', { method:'POST', headers, credentials:'include', body: JSON.stringify(body) })
    if (r.ok) { toast('Time logged'); onSaved() }
    else { const d = await r.json(); toast(d.error || 'Failed', 'error') }
    setSaving(false)
  }
  const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:480, padding:22 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14 }}>Log Time</div>
        {projects.length === 0 ? <div style={{ color:'var(--text-3)', fontSize:13 }}>Create a project first.</div> : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, color:'var(--text-3)' }}>Project</label>
                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} style={inp}>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp}/></div>
              <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Hours *</label><input type="number" step="0.25" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} style={inp}/></div>
              <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Hourly rate (override)</label><input type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} placeholder={project ? `Default: ₹${project.hourlyRate}` : ''} style={inp}/></div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-2)' }}>
                  <input type="checkbox" checked={form.billable} onChange={e => setForm({ ...form, billable: e.target.checked })}/> Billable
                </label>
              </div>
              <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, color:'var(--text-3)' }}>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What did you work on?" style={inp}/></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
              <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{saving ? 'Saving…' : '⏱ Log time'}</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
