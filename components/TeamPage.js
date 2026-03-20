import { useState, useEffect } from 'react'
import { Btn, Card, SectionTitle, EmptyState } from './ui'

const ROLES = [
  { id: 'admin',      label: 'Admin',      color: '#6366F1', desc: 'Full access — create, edit, delete, manage team' },
  { id: 'accountant', label: 'Accountant', color: '#3B82F6', desc: 'Create & edit invoices, POs, payments, view reports' },
  { id: 'viewer',     label: 'Viewer',     color: '#9EA3BF', desc: 'Read-only — view invoices, POs, reports' },
]

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.id === role) || ROLES[2]
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}30` }}>{r.label}</span>
}

function StatusBadge({ status }) {
  const colors = { active: { color: 'var(--green-text)', bg: 'var(--green-dim)' }, invited: { color: 'var(--amber-text)', bg: 'var(--amber-dim)' }, disabled: { color: 'var(--text-4)', bg: 'var(--surface-3)' } }
  const c = colors[status] || colors.active
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: c.bg, color: c.color }}>{status}</span>
}

function Avatar({ name, role }) {
  const r = ROLES.find(x => x.id === role) || ROLES[2]
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${r.color}20`, border: `2px solid ${r.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: r.color, flexShrink: 0 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

function InviteModal({ orgId, headers, toast, onClose, onDone }) {
  const [email, setEmail]   = useState('')
  const [role, setRole]     = useState('accountant')
  const [name, setName]     = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const send = async () => {
    if (!email.trim()) { toast('Email is required', 'error'); return }
    setSending(true)
    try {
      const r = await fetch('/api/team', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, name }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.upgrade) toast('Team members require the Business plan — upgrade in Billing', 'error')
        else toast(d.error || 'Failed', 'error')
        setSending(false); return
      }
      setResult(d)
      onDone()
    } catch (e) { toast(e.message, 'error') }
    setSending(false)
  }

  const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)', marginBottom: 14 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-xl)', width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Invite Team Member</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {result ? (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✉</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--green-text)', marginBottom: 6 }}>Invitation sent!</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>{result.message}</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Invite link (share manually if email fails)</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent-2)', wordBreak: 'break-all' }}>{result.inviteUrl}</div>
              </div>
              <Btn style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>Done</Btn>
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5 }}>Name (optional)</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />

                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5 }}>Email address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />

                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 8 }}>Role</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {ROLES.map(r => (
                    <button key={r.id} type="button" onClick={() => setRole(r.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      border: `1px solid ${role === r.id ? r.color : 'var(--border-2)'}`,
                      borderRadius: 'var(--r-md)', background: role === r.id ? `${r.color}12` : 'var(--surface-2)',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', transition: 'all 0.12s',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: role === r.id ? r.color : 'var(--text)' }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" style={{ flex: 2, justifyContent: 'center' }} onClick={send} disabled={sending}>
                  {sending ? 'Sending…' : '✉ Send Invitation'}
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeamPage({ org, headers, toast, user, onNavigate }) {
  const [members, setMembers]   = useState([])
  const [myRole, setMyRole]     = useState('viewer')
  const [loading, setLoading]   = useState(true)
  const [showInvite, setInvite] = useState(false)
  const [editRole, setEditRole] = useState({}) // { [id]: newRole }

  const load = () => {
    setLoading(true)
    fetch('/api/team', { headers })
      .then(r => r.json())
      .then(d => { setMembers(d.members || []); setMyRole(d.myRole || 'viewer'); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [org.id])

  const updateRole = async (memberId, role) => {
    const r = await fetch(`/api/team/${memberId}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const d = await r.json()
    if (r.ok) { toast(`Role updated to ${role}`); load() }
    else toast(d.error || 'Failed', 'error')
  }

  const toggleDisable = async (member) => {
    const newStatus = member.status === 'disabled' ? 'active' : 'disabled'
    if (newStatus === 'disabled' && !confirm(`Disable ${member.name}? They won't be able to log in.`)) return
    const r = await fetch(`/api/team/${member._id}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const d = await r.json()
    if (r.ok) { toast(newStatus === 'active' ? 'Member re-enabled' : 'Member disabled'); load() }
    else toast(d.error || 'Failed', 'error')
  }

  const removeMember = async (member) => {
    if (!confirm(`Remove ${member.name} from the team? This cannot be undone.`)) return
    const r = await fetch(`/api/team/${member._id}`, { method: 'DELETE', headers })
    if (r.ok) { toast('Member removed'); load() }
  }

  const isAdmin = myRole === 'admin'

  return (
    <div>
      {showInvite && (
        <InviteModal
          orgId={org.id} headers={headers} toast={toast}
          onClose={() => setInvite(false)}
          onDone={() => { setInvite(false); load() }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Team Members</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            Manage who has access to <b style={{ color: 'var(--text-2)' }}>{org.id}</b> · {members.length}/5 members
          </p>
        </div>
        {isAdmin && (
          <Btn variant="primary" onClick={() => setInvite(true)}>+ Invite Member</Btn>
        )}
      </div>

      {/* Business plan gate */}
      {user?.plan !== 'business' && (
        <div style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--r-md)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--accent-2)', fontSize: 13 }}>Business plan required</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Team members are available on the Business plan (₹2,499/month). Upgrade in Billing to invite up to 5 teammates.</div>
          </div>
          <Btn variant="primary" style={{ flexShrink: 0, marginLeft: 'auto' }} onClick={() => onNavigate('billing')}>Upgrade →</Btn>
        </div>
      )}

      {/* Role legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {ROLES.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
            <b style={{ color: r.color }}>{r.label}</b>
            <span style={{ color: 'var(--text-3)' }}>— {r.desc}</span>
          </div>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
        ) : members.length === 0 ? (
          <EmptyState message="No team members yet. Invite someone to collaborate." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Member','Email','Role','Status','Joined',''].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-3)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const isMe = String(m._id) === user?.userId
                return (
                  <tr key={m._id} style={{ borderBottom: '1px solid var(--border)', opacity: m.status === 'disabled' ? 0.5 : 1, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={m.name} role={m.role} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{m.name}{isMe && <span style={{ fontSize: 10, color: 'var(--accent-2)', marginLeft: 6 }}>(you)</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>{m.email}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {isAdmin && !isMe ? (
                        <select value={editRole[m._id] || m.role} onChange={e => { setEditRole(prev => ({ ...prev, [m._id]: e.target.value })); updateRole(m._id, e.target.value) }}
                          style={{ padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--text)', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)' }}>
                          {ROLES.map(r => <option key={r.id} value={r.id} style={{ background: 'var(--bg-2)' }}>{r.label}</option>)}
                        </select>
                      ) : <RoleBadge role={m.role} />}
                    </td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={m.status || 'active'} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-3)' }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {isAdmin && !isMe && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {m.status === 'invited' && (
                            <span style={{ fontSize: 11, color: 'var(--amber-text)', padding: '3px 8px', background: 'var(--amber-dim)', borderRadius: 99 }}>Pending</span>
                          )}
                          <Btn size="sm" onClick={() => toggleDisable(m)}>
                            {m.status === 'disabled' ? 'Enable' : 'Disable'}
                          </Btn>
                          <Btn size="sm" variant="danger" onClick={() => removeMember(m)}>Remove</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{members.filter(m => m.status !== 'disabled').length} active · {members.filter(m => m.status === 'invited').length} pending</span>
          <span>Max 5 on Business plan</span>
        </div>
      </Card>
    </div>
  )
}