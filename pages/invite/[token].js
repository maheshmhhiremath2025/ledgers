import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function InvitePage({ token }) {
  const [info, setInfo]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [name, setName]       = useState('')
  const [password, setPass]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  useEffect(() => {
    fetch(`/api/team/accept?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else { setInfo(d); setName(d.name || '') }; setLoading(false) })
      .catch(() => { setError('Failed to load invite'); setLoading(false) })
  }, [token])

  const submit = async e => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setSaving(true); setError(null)
    try {
      const r = await fetch('/api/team/accept', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      if (d.token) localStorage.setItem('sb_token', d.token)
      setDone(true)
      setTimeout(() => window.location.href = '/', 2000)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const PAGE = { minHeight: '100vh', background: '#0D0F1A', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
  const CARD = { background: '#1E2140', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }
  const INPUT = { width: '100%', padding: '10px 13px', background: '#252848', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, color: '#ECEEF8', outline: 'none', fontFamily: 'inherit', marginBottom: 12 }
  const LABEL = { display: 'block', fontSize: 12, color: '#636880', fontWeight: 500, marginBottom: 5 }

  if (loading) return <div style={PAGE}><div style={{ color: '#636880' }}>Loading…</div></div>

  if (done) return (
    <div style={PAGE}>
      <div style={{ ...CARD, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#6EE7B7', marginBottom: 8 }}>Account activated!</div>
        <div style={{ fontSize: 13, color: '#636880' }}>Redirecting you to the app…</div>
      </div>
    </div>
  )

  if (error && !info) return (
    <div style={PAGE}>
      <div style={{ ...CARD, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <div style={{ fontSize: 16, color: '#FCA5A5', marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 13, color: '#636880' }}>Contact your admin for a new invite link.</div>
      </div>
    </div>
  )

  const ROLE_DESC = { admin: 'Full access — create, edit, delete everything', accountant: 'Can create and edit invoices, POs, payments', viewer: 'Read-only access — can view but not edit' }

  return (
    <>
      <Head><title>Accept Invitation — Synergific Books</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={PAGE}>
        <div style={CARD}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(99,102,241,0.4)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ECEEF8' }}>Synergific Books</span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#ECEEF8', marginBottom: 6, letterSpacing: '-0.4px' }}>You're invited!</h1>
            <p style={{ fontSize: 13, color: '#9EA3BF', lineHeight: 1.5 }}>
              You've been invited to join <b style={{ color: '#ECEEF8' }}>{info?.orgId}</b> as
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#A5B4FC', textTransform: 'capitalize' }}>{info?.role}</span>
              <span style={{ fontSize: 11, color: '#636880' }}>— {ROLE_DESC[info?.role]}</span>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 13px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>{error}</div>
          )}

          <form onSubmit={submit}>
            <label style={LABEL}>Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" style={INPUT}
              onFocus={e => e.target.style.borderColor = '#6366F1'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />

            <label style={LABEL}>Email</label>
            <input value={info?.email || ''} disabled style={{ ...INPUT, opacity: 0.5, cursor: 'not-allowed' }} />

            <label style={LABEL}>Set Password</label>
            <input type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="Min 6 characters" style={INPUT}
              onFocus={e => e.target.style.borderColor = '#6366F1'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />

            <label style={LABEL}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" style={{ ...INPUT, marginBottom: 20 }}
              onFocus={e => e.target.style.borderColor = '#6366F1'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />

            <button type="submit" disabled={saving} style={{ width: '100%', padding: '11px', background: saving ? '#3A3E5C' : '#6366F1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)' }}>
              {saving ? 'Activating account…' : 'Accept Invitation & Join →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ params }) {
  return { props: { token: params?.token || null } }
}