import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

export default function ResetPage() {
  const router = useRouter()
  const { token }             = router.query
  const [password, setPass]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setMsg('')
    if (password !== confirm) { setErr('Passwords do not match'); return }
    if (password.length < 6)  { setErr('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const d = await r.json()
      if (r.ok) {
        setMsg(d.message || 'Password updated.')
        setTimeout(() => router.push('/app'), 1500)
      } else setErr(d.error || 'Something went wrong')
    } catch { setErr('Network error') }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '11px 13px', background: 'var(--surface-2)',
    border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
  }

  return (
    <>
      <Head><title>Reset Password · HexaLabs Books</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', marginBottom: 6 }}>Set a new password</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>Enter a new password for your account. Minimum 6 characters.</p>
          </div>

          {msg && <div style={{ background: 'var(--green-dim)', color: 'var(--green-text)', padding: '11px 14px', borderRadius: 'var(--r)', fontSize: 13, marginBottom: 14, border: '1px solid rgba(16,185,129,0.25)' }}>{msg} Redirecting to sign in…</div>}
          {err && <div style={{ background: 'var(--red-dim)', color: 'var(--red-text)', padding: '11px 14px', borderRadius: 'var(--r)', fontSize: 13, marginBottom: 14, border: '1px solid rgba(239,68,68,0.25)' }}>{err}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>New Password</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPass(e.target.value)} placeholder="Min 6 characters" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Confirm Password</label>
              <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading || !token} style={{
              width: '100%', padding: '11px', background: loading ? 'var(--surface-3)' : 'var(--accent)',
              color: loading ? 'var(--text-3)' : '#fff', border: 'none', borderRadius: 'var(--r-md)',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              fontFamily: 'var(--font)',
            }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-4)' }}>
            <Link href="/app" style={{ color: 'var(--accent-2)', textDecoration: 'none', fontWeight: 600 }}>← Back to sign in</Link>
          </div>
        </div>
      </div>
    </>
  )
}
