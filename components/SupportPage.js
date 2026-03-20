import { useState } from 'react'

const CATEGORIES = ['Billing & Payments', 'Invoice Issue', 'Technical Problem', 'Account & Login', 'Feature Request', 'GST / Tax Query', 'Data / Export', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High']

const inp = { width:'100%', padding:'10px 13px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }
const lbl = { display:'block', fontSize:12, color:'var(--text-3)', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }
const onFocus = e => { e.target.style.borderColor='var(--accent)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)' }
const onBlur  = e => { e.target.style.borderColor='var(--border-2)'; e.target.style.boxShadow='none' }

export default function SupportPage({ user }) {
  const [name,     setName]     = useState(user?.name  || '')
  const [email,    setEmail]    = useState(user?.email || '')
  const [phone,    setPhone]    = useState('')
  const [subject,  setSubject]  = useState('')
  const [category, setCategory] = useState('Technical Problem')
  const [priority, setPriority] = useState('Medium')
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [success,  setSuccess]  = useState(null)
  const [error,    setError]    = useState('')

  const isBizOrPro = ['professional','business'].includes(user?.plan)
  const waText = encodeURIComponent(`Hi, I need support with Synergific Books (Org: ${user?.orgId||''}, Plan: ${user?.plan||''})`)
  const waUrl  = `https://wa.me/918884907660?text=${waText}`

  const submit = async () => {
    if (!name || !email || !subject || !message) { setError('Please fill in all required fields.'); return }
    setSending(true); setError('')
    try {
      const r = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, orgId: user?.orgId, plan: user?.plan, subject, category, priority, message }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setSuccess(d.ticketId)
      setSubject(''); setMessage(''); setPhone('')
    } catch(e) { setError(e.message) }
    setSending(false)
  }

  const card = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px 22px' }

  const contactCard = (color) => ({
    background:`${color}18`, border:`1px solid ${color}30`,
    borderRadius:'var(--r-lg)', padding:'18px 20px',
    display:'flex', flexDirection:'column', gap:6,
  })

  return (
    <div style={{ maxWidth:860, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:4 }}>Support Centre</h2>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>We're here to help. Raise a ticket or reach us directly.</p>
      </div>

      {/* Contact cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>

        {/* Email */}
        <div style={contactCard('#6366F1')}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:'var(--r)', background:'rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📧</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>Email Support</div>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>All plans · 24–48h response</div>
            </div>
          </div>
          <a href="mailto:itops@synergificsoftware.com" style={{ fontSize:13, color:'#818CF8', fontWeight:600, textDecoration:'none', marginTop:4 }}>
            itops@synergificsoftware.com
          </a>
        </div>

        {/* Phone */}
        <div style={{ ...contactCard('#10B981'), opacity: isBizOrPro ? 1 : 0.5, position:'relative', overflow:'hidden' }}>
          {!isBizOrPro && (
            <div style={{ position:'absolute', top:8, right:8, fontSize:10, fontWeight:700, background:'rgba(245,158,11,0.2)', color:'var(--amber-text)', padding:'2px 8px', borderRadius:99, border:'1px solid rgba(245,158,11,0.3)' }}>
              Pro & Business
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:'var(--r)', background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📞</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>Phone Support</div>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>{isBizOrPro ? 'Mon–Sat 9am–6pm IST' : 'Upgrade to unlock'}</div>
            </div>
          </div>
          {isBizOrPro ? (
            <a href="tel:+918884907660" style={{ fontSize:13, color:'var(--green-text)', fontWeight:600, textDecoration:'none', marginTop:4 }}>
              +91 88849 07660
            </a>
          ) : (
            <div style={{ fontSize:12, color:'var(--text-4)', marginTop:4 }}>Upgrade to Professional or Business plan</div>
          )}
        </div>

        {/* WhatsApp */}
        <div style={{ ...contactCard('#25D366'), position:'relative', overflow:'hidden' }}>
          {!isBizOrPro && (
            <div style={{ position:'absolute', top:8, right:8, fontSize:10, fontWeight:700, background:'rgba(245,158,11,0.2)', color:'var(--amber-text)', padding:'2px 8px', borderRadius:99, border:'1px solid rgba(245,158,11,0.3)' }}>
              Pro & Business
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:'var(--r)', background:'rgba(37,211,102,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>💬</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>WhatsApp</div>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>{isBizOrPro ? 'Priority · Faster response' : 'Upgrade to unlock'}</div>
            </div>
          </div>
          {isBizOrPro ? (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:13, color:'#25D366', fontWeight:600, textDecoration:'none', marginTop:4 }}>
              Chat on WhatsApp →
            </a>
          ) : (
            <div style={{ fontSize:12, color:'var(--text-4)', marginTop:4 }}>Upgrade to Professional or Business plan</div>
          )}
        </div>

      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>

        {/* Form */}
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:18 }}>🎫 Raise a Support Ticket</div>

          {success ? (
            <div style={{ textAlign:'center', padding:'32px 20px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:6 }}>Ticket Raised Successfully!</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--accent-2)', background:'var(--accent-dim)', padding:'6px 16px', borderRadius:'var(--r)', display:'inline-block', marginBottom:12 }}>{success}</div>
              <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.7 }}>
                Confirmation sent to <strong>{email}</strong>.<br/>Our team responds within 24–48 hours.
              </p>
              <button onClick={() => setSuccess(null)} style={{ marginTop:16, padding:'9px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r)', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, fontSize:13 }}>
                Raise Another Ticket
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Your Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Mahesh" style={inp} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={lbl}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inp} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <div>
                <label style={lbl}>Phone (optional)</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={inp} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Category *</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, cursor:'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                    {CATEGORIES.map(c => <option key={c} style={{ background:'var(--bg-2)' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Priority</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {PRIORITIES.map(p => (
                      <button key={p} onClick={() => setPriority(p)} style={{
                        flex:1, padding:'9px 0', borderRadius:'var(--r)',
                        border:`1px solid ${priority===p ? (p==='High'?'#EF4444':p==='Medium'?'#F59E0B':'#10B981') : 'var(--border-2)'}`,
                        background: priority===p ? (p==='High'?'rgba(239,68,68,0.12)':p==='Medium'?'rgba(245,158,11,0.12)':'rgba(16,185,129,0.12)') : 'var(--surface-2)',
                        color: priority===p ? (p==='High'?'#EF4444':p==='Medium'?'#F59E0B':'#10B981') : 'var(--text-3)',
                        cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'var(--font)', transition:'all 0.15s',
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={lbl}>Subject *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" style={inp} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label style={lbl}>Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                  placeholder="Describe your issue in detail — steps to reproduce, what you expected vs what happened, any error messages..."
                  style={{ ...inp, resize:'vertical' }} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {error && (
                <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--r)', fontSize:13, color:'var(--red-text)' }}>
                  {error}
                </div>
              )}

              <button onClick={submit} disabled={sending}
                style={{ padding:'11px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r)', cursor:sending?'not-allowed':'pointer', fontFamily:'var(--font)', fontWeight:700, fontSize:14, opacity:sending?0.7:1, boxShadow:'0 4px 14px rgba(99,102,241,0.4)' }}
                onMouseEnter={e => { if(!sending) e.currentTarget.style.boxShadow='0 6px 20px rgba(99,102,241,0.55)' }}
                onMouseLeave={e => e.currentTarget.style.boxShadow='0 4px 14px rgba(99,102,241,0.4)'}>
                {sending ? '⏳ Sending…' : '🎫 Submit Support Ticket'}
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <div style={card}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:12 }}>Your Support Level</div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--r)', marginBottom:8 }}>
              <span style={{ fontSize:12, color:'var(--text-3)' }}>Current plan</span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--accent-2)', textTransform:'capitalize' }}>{user?.plan || 'Starter'}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.7 }}>
              {user?.plan === 'business'     ? '✅ Priority WhatsApp + Email + Phone' :
               user?.plan === 'professional' ? '✅ WhatsApp + Email + Phone support' :
               '✅ Email support only'}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:12 }}>Common Questions</div>
            {[
              { q:'How do I configure email sending?',  a:'Go to Configuration → Email tab. Add your SMTP host, port, Gmail/Outlook credentials.' },
              { q:'Why is my invoice PDF blank?',        a:'Check if business name and address are set in Configuration → Business tab.' },
              { q:'How do I upgrade my plan?',           a:'Go to Billing in the sidebar. Choose Professional or Business and pay via Razorpay.' },
              { q:'Can I export my data?',               a:'Yes — use the Export CSV button in Invoices, Customers, Expenses (Business plan).' },
            ].map(f => (
              <div key={f.q} style={{ marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:3 }}>Q: {f.q}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6 }}>{f.a}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:10 }}>⏰ Support Hours</div>
            <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.9 }}>
              Mon – Sat: <strong style={{ color:'var(--text-2)' }}>9:00 AM – 6:00 PM IST</strong><br/>
              Sunday: <strong style={{ color:'var(--text-2)' }}>Closed</strong><br/>
              Email tickets: <strong style={{ color:'var(--text-2)' }}>24–48h response</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}