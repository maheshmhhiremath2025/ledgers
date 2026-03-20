import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Btn } from './ui'

function NewOrgModal({ headers, toast, onClose, onCreated }) {
  const [orgId,     setOrgId]     = useState('')
  const [bizName,   setBizName]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [preview,   setPreview]   = useState('')

  const handleOrgId = v => {
    setOrgId(v)
    setPreview(v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g,'-').replace(/^-|-$/g,''))
  }

  const create = async () => {
    if (!orgId.trim()) { toast('Organisation ID is required', 'error'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/orgs', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: orgId.trim(), businessName: bizName.trim() }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.upgrade) toast('Business plan required (₹2,499/mo) — upgrade in Billing to add more organisations', 'error')
        else if (d.limitReached) toast('You have reached the maximum of 3 organisations on the Business plan', 'error')
        else toast(d.error || 'Failed', 'error')
        setSaving(false); return
      }
      toast(`✓ Organisation "${d.orgId}" created!`)
      onCreated(d.orgId)
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }
  const lbl = { display:'block', fontSize:12, color:'var(--text-3)', fontWeight:500, marginBottom:5 }

  return createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div className="fade-up" style={{ background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-xl)', width:'100%', maxWidth:420, boxShadow:'var(--shadow-lg)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Create New Organisation</div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface-3)', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={lbl}>Business Name</label>
            <input value={bizName} onChange={e=>setBizName(e.target.value)} placeholder="Acme Corp" style={inp}
              onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)'}}
              onBlur={e=>{e.target.style.borderColor='var(--border-2)';e.target.style.boxShadow='none'}} />
          </div>
          <div>
            <label style={lbl}>Organisation ID *</label>
            <input value={orgId} onChange={e=>handleOrgId(e.target.value)} placeholder="acme-corp" style={inp}
              onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)'}}
              onBlur={e=>{e.target.style.borderColor='var(--border-2)';e.target.style.boxShadow='none'}} />
            {preview && preview !== orgId && (
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:5 }}>Will be saved as: <span style={{ fontFamily:'var(--mono)', color:'var(--accent-2)' }}>{preview}</span></div>
            )}
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>Lowercase letters, numbers and hyphens only. Cannot be changed later.</div>
          </div>
          <div style={{ padding:'10px 12px', background:'var(--accent-dim)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'var(--r)', fontSize:12, color:'var(--accent-3)', display:'flex', flexDirection:'column', gap:4 }}>
            <div>💡 Each organisation has its own invoices, customers, ledger and settings.</div>
            <div style={{ color:'var(--text-3)' }}>🔒 Requires <strong style={{color:'var(--accent-2)'}}>Business plan</strong> · Max <strong style={{color:'var(--accent-2)'}}>3 organisations</strong> per account</div>
          </div>
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8, background:'var(--bg-3)' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={create} disabled={saving}>{saving ? 'Creating…' : '+ Create Organisation'}</Btn>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function OrgSwitcher({ user, headers, collapsed, onSwitch, toast }) {
  const [orgs,        setOrgs]      = useState([])
  const [maxOrgs,     setMaxOrgs]   = useState(3)
  const [open,        setOpen]      = useState(false)
  const [showNew,     setShowNew]   = useState(false)
  const [switching,   setSwitching] = useState(null)
  const ref = useRef()

  useEffect(() => {
    if (!user) return
    fetch('/api/orgs', { headers })
      .then(r => r.json())
      .then(d => { setOrgs(d.orgs || []); setMaxOrgs(d.maxOrgs || 3) })
      .catch(() => {})
  }, [user?.orgId])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const switchOrg = async (targetOrgId) => {
    if (targetOrgId === user.orgId) { setOpen(false); return }
    setSwitching(targetOrgId)
    try {
      const r = await fetch('/api/orgs/switch', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetOrgId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      if (d.token) localStorage.setItem('sb_token', d.token)
      setOpen(false)
      onSwitch(d.user)
    } catch (e) { console.error(e) }
    setSwitching(null)
  }

  const currentOrg = orgs.find(o => o.isCurrent) || { orgId: user?.orgId, businessName: user?.orgId }
  const hasMultiple = orgs.length > 1

  if (collapsed) return null // Don't show when sidebar collapsed

  return (
    <div ref={ref} style={{ position: 'relative', padding: '6px 6px 0' }}>
      {/* Current org pill */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', background: open ? 'var(--surface-2)' : 'transparent',
        border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)',
        cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}>
        {/* Org avatar */}
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {(currentOrg.businessName || currentOrg.orgId || 'O').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentOrg.businessName || currentOrg.orgId}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{currentOrg.orgId}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="fade-up" style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', zIndex: 999 }}>
          {/* Header */}
          <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>
            Your organisations
          </div>

          {/* Org list */}
          {orgs.map(org => (
            <button key={org.orgId} onClick={() => switchOrg(org.orgId)} disabled={switching === org.orgId}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: org.isCurrent ? 'var(--accent-dim)' : 'none', border: 'none', cursor: org.isCurrent ? 'default' : 'pointer', borderBottom: '1px solid var(--border)', textAlign: 'left', fontFamily: 'var(--font)', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!org.isCurrent) e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { if (!org.isCurrent) e.currentTarget.style.background = 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: org.isCurrent ? 'var(--accent)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: org.isCurrent ? '#fff' : 'var(--text-3)', flexShrink: 0 }}>
                {(org.businessName || org.orgId).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: org.isCurrent ? 'var(--accent-2)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {org.businessName || org.orgId}
                  {org.isCurrent && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--accent-3)' }}>Current</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)' }}>{org.orgId}</span>
                  <span>·</span>
                  <span style={{ textTransform: 'capitalize' }}>{org.role}</span>
                </div>
              </div>
              {switching === org.orgId && (
                <div style={{ width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              )}
              {org.isCurrent && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--accent-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          ))}

          {/* Create new org — gated */}
          {(() => {
            const atLimit = orgs.length >= maxOrgs
            const notBusiness = user?.plan !== 'business'
            const disabled = atLimit || notBusiness
            return (
              <button
                onClick={() => { if (!disabled) { setOpen(false); setShowNew(true) } }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', color: disabled ? 'var(--text-4)' : 'var(--text-3)', fontSize: 13, opacity: disabled ? 0.6 : 1 }}
                onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent-2)' } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = disabled ? 'var(--text-4)' : 'var(--text-3)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px dashed ${disabled ? 'var(--border)' : 'var(--border-3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>+</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500 }}>
                    {atLimit ? `Limit reached (${maxOrgs}/${maxOrgs})` : 'Create new organisation'}
                  </div>
                  {notBusiness && (
                    <div style={{ fontSize: 10, color: 'var(--amber-text)', marginTop: 1 }}>🔒 Business plan only · ₹2,499/mo</div>
                  )}
                  {!notBusiness && !atLimit && (
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>{orgs.length}/{maxOrgs} orgs used</div>
                  )}
                  {atLimit && !notBusiness && (
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>Max 3 organisations on Business plan</div>
                  )}
                </div>
              </button>
            )
          })()}
        </div>
      )}

      {/* New org modal */}
      {showNew && (
        <NewOrgModal headers={headers} toast={toast}
          onClose={() => setShowNew(false)}
          onCreated={async (newOrgId) => {
            setShowNew(false)
            // Refresh org list
            const r = await fetch('/api/orgs', { headers })
            const d = await r.json()
            setOrgs(d.orgs || []); setMaxOrgs(d.maxOrgs || 3)
            // Switch to new org
            await switchOrg(newOrgId)
          }} />
      )}
    </div>
  )
}