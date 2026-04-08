import { useState, useEffect } from 'react'

export default function TwoFactorPage({ headers, toast }) {
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep]       = useState('idle') // idle | setup | verify | done | disable
  const [secret, setSecret]   = useState('')
  const [otpauthUrl, setOtpauthUrl] = useState('')
  const [code, setCode]       = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [busy, setBusy]       = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/auth/2fa/status', { headers, credentials:'include' })
      .then(r => r.json()).then(d => { setStatus(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const startSetup = async () => {
    setBusy(true)
    const r = await fetch('/api/auth/2fa/setup', { method:'POST', headers, credentials:'include', body: JSON.stringify({}) })
    const d = await r.json()
    if (r.ok) { setSecret(d.secret); setOtpauthUrl(d.otpauthUrl); setStep('setup'); setCode('') }
    else toast(d.error || 'Failed', 'error')
    setBusy(false)
  }

  const verifyAndEnable = async () => {
    if (!code) { toast('Enter the 6-digit code from your app', 'error'); return }
    setBusy(true)
    const r = await fetch('/api/auth/2fa/setup', { method:'POST', headers, credentials:'include', body: JSON.stringify({ secret, code }) })
    const d = await r.json()
    if (r.ok) { setBackupCodes(d.backupCodes || []); setStep('done'); load() }
    else toast(d.error || 'Invalid code', 'error')
    setBusy(false)
  }

  const disable = async () => {
    if (!code) { toast('Enter your current authenticator code to disable', 'error'); return }
    setBusy(true)
    const r = await fetch('/api/auth/2fa/disable', { method:'POST', headers, credentials:'include', body: JSON.stringify({ code }) })
    const d = await r.json()
    if (r.ok) { toast('2FA disabled'); setStep('idle'); setCode(''); load() }
    else toast(d.error || 'Failed', 'error')
    setBusy(false)
  }

  const qrUrl = otpauthUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}` : ''

  if (loading) return <div style={{ color:'var(--text-3)', padding:40 }}>Loading…</div>

  return (
    <div style={{ maxWidth:680 }}>
      <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>Two-Factor Authentication</h2>
      <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4, marginBottom:24 }}>
        Add an extra layer of security to your account using a TOTP authenticator app like Google Authenticator, Authy, or 1Password. <b style={{ color:'var(--text-2)' }}>Optional but recommended.</b>
      </div>

      {status?.enabled && step !== 'disable' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--green)', borderRadius:'var(--r-lg)', padding:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ background:'var(--green-dim)', color:'var(--green-text)', padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>✓ Enabled</span>
          </div>
          <div style={{ fontSize:14, color:'var(--text-2)', marginBottom:6 }}>Two-factor authentication is active on your account. You'll need a code from your authenticator app at every sign-in.</div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:18 }}>Backup codes remaining: <b style={{ color: status.backupCodesRemaining > 3 ? 'var(--text-2)' : 'var(--amber-text)' }}>{status.backupCodesRemaining}</b> of 10</div>
          <button onClick={() => setStep('disable')} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.5)', color:'var(--red)', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>Disable 2FA</button>
        </div>
      )}

      {!status?.enabled && step === 'idle' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span style={{ background:'var(--surface-3)', color:'var(--text-3)', padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>Not enabled</span>
          </div>
          <div style={{ fontSize:14, color:'var(--text-2)', marginBottom:18, lineHeight:1.6 }}>
            You can sign in normally with just your password. Enable 2FA for stronger account security — you'll be asked for a 6-digit code from your authenticator app at every sign-in.
          </div>
          <button onClick={startSetup} disabled={busy} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 22px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{busy ? 'Setting up…' : '🔐 Enable 2FA'}</button>
        </div>
      )}

      {step === 'setup' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:22 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>Step 1 — Scan this QR code in your authenticator app</div>
          <div style={{ display:'flex', gap:24, marginBottom:18, flexWrap:'wrap' }}>
            <img src={qrUrl} alt="QR code" width={220} height={220} style={{ background:'#fff', padding:8, borderRadius:8 }}/>
            <div style={{ flex:1, minWidth:240 }}>
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Or enter this code manually:</div>
              <code style={{ display:'block', padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', fontFamily:'var(--mono)', wordBreak:'break-all', marginBottom:14 }}>{secret}</code>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>Issuer: <b>HexaLabs Books</b><br/>Algorithm: SHA1<br/>Digits: 6 · Period: 30s</div>
            </div>
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Step 2 — Enter the 6-digit code your app shows</div>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0,6))} placeholder="000000" autoFocus
            style={{ width:200, padding:'12px 16px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:18, marginBottom:14, outline:'none', fontFamily:'var(--mono)', letterSpacing:'0.2em', textAlign:'center' }}/>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setStep('idle')} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
            <button onClick={verifyAndEnable} disabled={busy || code.length !== 6} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 22px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{busy ? 'Verifying…' : 'Verify & enable'}</button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--green)', borderRadius:'var(--r-lg)', padding:22 }}>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--green-text)', marginBottom:6 }}>✓ 2FA enabled</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:16 }}>Save these <b>backup codes</b> in a safe place. Each can be used once if you lose access to your authenticator app. They will not be shown again.</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, padding:14, background:'var(--surface-2)', borderRadius:'var(--r)', marginBottom:14 }}>
            {backupCodes.map(c => <code key={c} style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--text)' }}>{c}</code>)}
          </div>
          <button onClick={() => navigator.clipboard.writeText(backupCodes.join('\n')).then(() => toast('Backup codes copied'))} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, marginRight:8, fontFamily:'var(--font)' }}>📋 Copy codes</button>
          <button onClick={() => { setStep('idle'); setBackupCodes([]); load() }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>I've saved them</button>
        </div>
      )}

      {step === 'disable' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--red)', borderRadius:'var(--r-lg)', padding:22 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--red-text)', marginBottom:8 }}>Disable Two-Factor Authentication</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:14 }}>Enter your current 6-digit authenticator code to confirm.</div>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0,6))} placeholder="000000" autoFocus
            style={{ width:200, padding:'10px 14px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:16, marginBottom:14, outline:'none', fontFamily:'var(--mono)', letterSpacing:'0.2em', textAlign:'center' }}/>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setStep('idle'); setCode('') }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
            <button onClick={disable} disabled={busy} style={{ background:'var(--red)', color:'#fff', border:'none', padding:'9px 22px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{busy ? 'Disabling…' : 'Confirm disable'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
