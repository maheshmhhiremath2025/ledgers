import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function ForgotPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setMsg(''); setErr('')
    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (r.ok) setMsg(d.message || 'If an account exists, a reset link has been sent.')
      else setErr(d.error || 'Something went wrong')
    } catch {
      setErr('Network error')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '11px 13px', background: 'var(--surface-2)',
    border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <>
      <Head><title>Forgot Password · HexaLabs Books</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', marginBottom: 6 }}>Forgot password?</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>Enter your account email and we'll send you a link to reset your password.</p>
          </div>

          {msg && <div style={{ background: 'var(--green-dim)', color: 'var(--green-text)', padding: '11px 14px', borderRadius: 'var(--r)', fontSize: 13, marginBottom: 14, border: '1px solid rgba(16,185,129,0.25)' }}>{msg}</div>}
          {err && <div style={{ background: 'var(--red-dim)', color: 'var(--red-text)', padding: '11px 14px', borderRadius: 'var(--r)', fontSize: 13, marginBottom: 14, border: '1px solid rgba(239,68,68,0.25)' }}>{err}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', background: loading ? 'var(--surface-3)' : 'var(--accent)',
              color: loading ? 'var(--text-3)' : '#fff', border: 'none', borderRadius: 'var(--r-md)',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              fontFamily: 'var(--font)',
            }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
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
