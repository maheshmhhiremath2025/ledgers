import Head from 'next/head'
import { useEffect, useState, useRef } from 'react'

const FEATURES = [
  { icon: '📄', title: 'Professional Invoicing', tag: 'Core', color: '#6366F1', desc: 'Create clean, GST-compliant invoices in seconds. 5 PDF templates, auto-numbering, customer auto-fill, due dates, notes and terms — send by email in one click.' },
  { icon: '💳', title: 'Online Payment Portal', tag: 'Payments', color: '#10B981', desc: 'Every invoice gets a unique payment link. Customers pay instantly via UPI, credit/debit cards or net banking — powered by Razorpay. Invoice auto-marks as paid.' },
  { icon: '📒', title: 'Double-Entry Ledger', tag: 'Accounting', color: '#3B82F6', desc: 'Every invoice, payment and expense automatically posts balanced journal entries. Real-time chart of accounts, ledger drill-down, account statements — always accurate.' },
  { icon: '📊', title: 'Financial Reports', tag: 'Reports', color: '#F59E0B', desc: 'Profit & Loss, Balance Sheet, Trial Balance and GST reports — all auto-generated from your data. Export to CSV for your accountant. Always up to date.' },
  { icon: '🔁', title: 'Recurring Invoices', tag: 'Automation', color: '#8B5CF6', desc: 'Set weekly, monthly or quarterly billing schedules. Invoices are created, numbered and emailed to clients automatically on schedule — zero manual effort.' },
  { icon: '💸', title: 'Expense Tracking', tag: 'Expenses', color: '#EF4444', desc: 'Record business expenses by category — Rent, Salaries, Travel, Software and more. Each expense auto-posts to your ledger. Monthly breakdown on your dashboard.' },
  { icon: '📦', title: 'Purchase Orders', tag: 'Procurement', color: '#0EA5E9', desc: 'Raise purchase orders to vendors, track delivery status, and auto-record payments when marked as received. Full vendor billing history at a glance.' },
  { icon: '👥', title: 'Team & Role Access', tag: 'Collaboration', color: '#14B8A6', desc: 'Invite your accountant or team members via email. Admin, Accountant and Viewer roles — fine-grained access control so everyone sees only what they need.' },
  { icon: '⚠️', title: 'Overdue Reminders', tag: 'Automation', color: '#F97316', desc: 'Auto-email customers when invoices are overdue. Escalating urgency — 1 day, 7 days, 14 days past due. Each reminder includes a direct payment link.' },
]

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: '₹0', period: 'free forever', highlight: false, color: '#636880',
    desc: 'Perfect for freelancers just getting started.',
    features: ['5 invoices / month', '3 purchase orders / month', 'Classic PDF template', 'Chart of accounts', 'GST reports', '1 organisation'],
    cta: 'Start free',
  },
  {
    id: 'pro', name: 'Professional', price: '₹999', period: '/month', highlight: true, color: '#6366F1',
    desc: 'For growing businesses that need full features.',
    features: ['Unlimited invoices & POs', 'All 5 PDF templates', 'Logo on invoices', 'GST & bank configuration', 'Saved customers', 'Email delivery (Gmail/Outlook)', 'Customer payment portal', 'Recurring invoices', 'Expense tracking'],
    cta: 'Get Professional',
  },
  {
    id: 'biz', name: 'Business', price: '₹2,499', period: '/month', highlight: false, color: '#10B981',
    desc: 'For teams, agencies and growing companies.',
    features: ['Everything in Professional', '5 team members', 'Admin / Accountant / Viewer roles', 'CSV & Excel export', 'Overdue auto-reminders', 'Team invite by email', 'Role-based access control', 'Priority support'],
    cta: 'Get Business',
  },
]

const STATS = [
  { value: '< 60s', label: 'to create first invoice' },
  { value: '₹0', label: 'to get started' },
  { value: 'GSTR-1', label: 'export in one click' },
  { value: '5', label: 'PDF templates' },
]

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Freelance UI/UX Designer', avatar: 'P', color: '#6366F1', text: 'Finally an invoicing tool that actually understands Indian GST. I used to spend hours every month on invoices — now it takes 5 minutes. The recurring billing is a lifesaver.' },
  { name: 'Rahul M.', role: 'Independent Software Consultant', avatar: 'R', color: '#10B981', text: 'The payment portal changed everything for me. Clients used to take 30+ days to pay. Now they click the link in the email and pay the same day. Outstanding feature.' },
  { name: 'Anita K.', role: 'Chartered Accountant', avatar: 'A', color: '#F59E0B', text: 'I recommend Synergific Books to all my clients. The GSTR-1 export is accurate and the trial balance is always in sync with the journal entries. Genuinely impressive.' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Sign up free', desc: 'Create your account in 30 seconds. No credit card, no setup fees — you\'re up and running immediately.' },
  { step: '02', title: 'Configure your org', desc: 'Add your business name, GSTIN, logo, bank details and signature. Everything auto-fills on every invoice you create.' },
  { step: '03', title: 'Create & send invoices', desc: 'Pick a customer, add line items, choose a PDF template and hit send. Your customer gets a branded email with a payment link.' },
  { step: '04', title: 'Get paid & stay compliant', desc: 'Payments update instantly. Your ledger, reports and GSTR data stay in sync automatically — nothing to do at month end.' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [activeFeature, setActiveFeature] = useState(0)
  const [logoErr, setLogoErr] = useState(false)
  const [visibleSections, setVisibleSections] = useState(new Set())
  const observerRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('sb_theme') || 'dark'
    setIsDark(saved === 'dark')
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)

    // Intersection observer for scroll animations
    observerRef.current = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setVisibleSections(p => new Set([...p, e.target.id])) }),
      { threshold: 0.15 }
    )
    document.querySelectorAll('[data-animate]').forEach(el => observerRef.current?.observe(el))

    return () => { window.removeEventListener('scroll', onScroll); observerRef.current?.disconnect() }
  }, [])

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    localStorage.setItem('sb_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const isVisible = id => visibleSections.has(id)

  const bg      = isDark ? '#0A0C18' : '#F0F2F8'
  const bg2     = isDark ? '#11142A' : '#E8EBF5'
  const surface = isDark ? '#191D3A' : '#FFFFFF'
  const surf2   = isDark ? '#1E2346' : '#F7F8FD'
  const border  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.12)'
  const border2 = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.2)'
  const text    = isDark ? '#ECEEF8' : '#0F1729'
  const text2   = isDark ? '#8B90B0' : '#374151'
  const text3   = isDark ? '#4A4E6A' : '#6B7280'
  const accent  = '#6366F1'
  const F = "'DM Sans', system-ui, sans-serif"
  const M = "'DM Mono', monospace"

  const animStyle = (id, delay = 0) => ({
    opacity: isVisible(id) ? 1 : 0,
    transform: isVisible(id) ? 'none' : 'translateY(28px)',
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  })

  return (
    <>
      <Head>
        <title>Synergific Books — GST Invoicing & Accounting Software</title>
        <meta name="description" content="Professional GST invoicing, double-entry accounting, financial reports and online payments for freelancers and businesses. Free to start." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Synergific Books — GST Invoicing for India" />
        <meta property="og:description" content="Create GST invoices, manage your ledger, generate financial reports and accept online payments — all in one app." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body { background: ${bg}; }
          ::selection { background: rgba(99,102,241,0.3); color: ${text}; }
          ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #6366F1; border-radius: 99px; }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
          @keyframes spin { to{transform:rotate(360deg)} }
          @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
          .glow-btn:hover { box-shadow: 0 8px 32px rgba(99,102,241,0.6) !important; transform: translateY(-1px); }
          .glow-btn { transition: all 0.2s !important; }
          .card-hover:hover { border-color: rgba(99,102,241,0.35) !important; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.12) !important; }
          .card-hover { transition: all 0.2s !important; }
          .nav-link:hover { color: #6366F1 !important; }
          .nav-link { transition: color 0.15s !important; }
          .step-num { background: linear-gradient(135deg, #6366F1, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        `}</style>
      </Head>

      <div style={{ background: bg, color: text, fontFamily: F, minHeight: '100vh', overflowX: 'hidden' }}>

        {/* ═══ NAVBAR ═══ */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          background: scrolled ? (isDark ? 'rgba(10,12,24,0.92)' : 'rgba(240,242,248,0.92)') : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid ${border}` : '1px solid transparent',
          transition: 'all 0.3s',
        }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Logo */}
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              {!logoErr
                ? <img src="/logo.png" alt="Synergific Books"
                    onError={() => setLogoErr(true)}
                    style={{ height: 32, objectFit: 'contain', display: 'block' }} />
                : <>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}>
                      <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px', color: text }}>Synergific Books</span>
                  </>
              }
            </a>

            {/* Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              {[['Features','#features'],['How it works','#how'],['Pricing','#pricing']].map(([l,h]) => (
                <a key={l} href={h} className="nav-link" style={{ fontSize: 14, color: text2, fontWeight: 500, textDecoration: 'none' }}>{l}</a>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: 9, background: surface, border: `1px solid ${border}`, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {isDark ? '☀️' : '🌙'}
              </button>
              <a href="/app" style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, color: text2, border: `1px solid ${border2}`, borderRadius: 9, textDecoration: 'none', background: surface, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border2; e.currentTarget.style.color = text2 }}>
                Log in
              </a>
              <a href="/app" className="glow-btn" style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: accent, borderRadius: 9, textDecoration: 'none', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                Get started free →
              </a>
            </div>
          </div>
        </nav>

        {/* ═══ HERO ═══ */}
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: '140px 28px 80px', textAlign: 'center', position: 'relative' }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, fontSize: 12.5, fontWeight: 600, color: '#818CF8', marginBottom: 32 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6EE7B7', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              GST-compliant · Double-entry accounting · Free to start
            </div>

            <h1 style={{ fontSize: 'clamp(40px, 6.5vw, 72px)', fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1.08, marginBottom: 24, color: text }}>
              Invoicing &amp; accounting<br />
              <span style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                that works the way
              </span><br />
              your business does
            </h1>

            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: text2, lineHeight: 1.7, maxWidth: 580, margin: '0 auto 44px', fontWeight: 400 }}>
              Create GST invoices, track expenses, manage your ledger, generate financial reports and accept online payments — all in one beautifully simple app.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
              <a href="/app" className="glow-btn" style={{ padding: '15px 32px', fontSize: 16, fontWeight: 700, color: '#fff', background: accent, borderRadius: 12, textDecoration: 'none', boxShadow: '0 6px 28px rgba(99,102,241,0.5)' }}>
                Start for free — no credit card
              </a>
              <a href="#features" style={{ padding: '15px 28px', fontSize: 15, fontWeight: 600, color: text2, background: surface, border: `1px solid ${border2}`, borderRadius: 12, textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border2; e.currentTarget.style.color = text2 }}>
                Explore features ↓
              </a>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 0, flexWrap: 'wrap', border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', maxWidth: 640, margin: '0 auto', background: surface }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{ flex: 1, minWidth: 140, padding: '18px 16px', textAlign: 'center', borderRight: i < STATS.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ fontFamily: M, fontSize: 22, fontWeight: 700, color: accent, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: text3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ APP PREVIEW ═══ */}
        <section style={{ maxWidth: 1000, margin: '0 auto 100px', padding: '0 28px' }}>
          <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${border2}`, boxShadow: isDark ? '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)' : '0 40px 120px rgba(99,102,241,0.15)', animation: 'float 6s ease-in-out infinite' }}>
            {/* Browser chrome */}
            <div style={{ background: bg2, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}` }}>
              {['#EF4444','#F59E0B','#10B981'].map((c,i) => <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
              <div style={{ flex: 1, height: 24, background: surface, borderRadius: 7, marginLeft: 10, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#10B981" strokeWidth="2" fill="none"/></svg>
                <span style={{ fontSize: 11, color: text3, fontFamily: M }}>app.synergificbooks.com/app</span>
              </div>
            </div>
            {/* Dashboard mock */}
            <div style={{ background: isDark ? '#0A0C18' : '#F0F2F8', padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                {[['FY Revenue','₹12,48,500','#818CF8'],['Outstanding','₹2,14,200','#FCD34D'],['Cash Balance','₹5,36,800','#6EE7B7'],['Net Profit','₹6,92,400','#6EE7B7']].map(([l,v,c]) => (
                  <div key={l} style={{ background: surface, borderRadius: 10, padding: '13px 14px', border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 9, color: text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>{l}</div>
                    <div style={{ fontFamily: M, fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
                <div style={{ background: surface, borderRadius: 10, padding: '14px 16px', border: `1px solid ${border}`, height: 110, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                  {[25,40,20,55,75,50,85,65,80,100,60,90].map((h,i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                      <div style={{ width: '46%', height: `${h*0.58}px`, background: '#6366F1', borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
                      <div style={{ width: '46%', height: `${h*0.13}px`, background: '#EF4444', borderRadius: '2px 2px 0 0', opacity: 0.7 }} />
                    </div>
                  ))}
                </div>
                <div style={{ background: surface, borderRadius: 10, padding: '14px 16px', border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 10, color: text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Recent invoices</div>
                  {[['INV-0042','Acme Corp','₹42,000','Paid'],['INV-0043','TechStart','₹18,500','Sent'],['INV-0044','GlobalCo','₹95,200','Overdue']].map(([n,c,a,s]) => (
                    <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${border}`, fontSize: 11 }}>
                      <div>
                        <div style={{ fontFamily: M, color: '#818CF8', fontWeight: 600 }}>{n}</div>
                        <div style={{ color: text3 }}>{c}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: M, fontWeight: 700, color: text }}>{a}</div>
                        <div style={{ color: s==='Paid'?'#6EE7B7':s==='Sent'?'#93C5FD':'#FCA5A5', fontWeight: 600 }}>{s}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section id="features" style={{ maxWidth: 1160, margin: '0 auto 100px', padding: '0 28px' }}>
          <div id="feat-head" data-animate style={{ textAlign: 'center', marginBottom: 60, ...animStyle('feat-head') }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#818CF8', marginBottom: 20 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 14, color: text }}>Everything your business needs</h2>
            <p style={{ fontSize: 17, color: text2, maxWidth: 500, margin: '0 auto' }}>From your first invoice to your CA's annual filing — we handle the complete financial cycle.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} id={`feat-${i}`} data-animate className="card-hover"
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: '24px 22px', cursor: 'default', ...animStyle(`feat-${i}`, i * 60) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: f.color, background: `${f.color}15`, padding: '2px 8px', borderRadius: 99, marginBottom: 4, display: 'inline-block' }}>{f.tag}</span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: text, lineHeight: 1.2 }}>{f.title}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: text2, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how" style={{ background: bg2, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '80px 28px', marginBottom: 100 }}>
          <div style={{ maxWidth: 1160, margin: '0 auto' }}>
            <div id="how-head" data-animate style={{ textAlign: 'center', marginBottom: 60, ...animStyle('how-head') }}>
              <div style={{ display: 'inline-block', padding: '5px 14px', background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#10B981', marginBottom: 20 }}>How it works</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-1.5px', color: text }}>Up and running in minutes</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
              {HOW_IT_WORKS.map((s, i) => (
                <div key={s.step} id={`how-${i}`} data-animate style={{ ...animStyle(`how-${i}`, i * 100) }}>
                  <div className="step-num" style={{ fontFamily: M, fontSize: 40, fontWeight: 800, marginBottom: 14, letterSpacing: '-1px' }}>{s.step}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: text, marginBottom: 10 }}>{s.title}</div>
                  <p style={{ fontSize: 13.5, color: text2, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PRICING ═══ */}
        <section id="pricing" style={{ maxWidth: 1160, margin: '0 auto 100px', padding: '0 28px' }}>
          <div id="price-head" data-animate style={{ textAlign: 'center', marginBottom: 60, ...animStyle('price-head') }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#F59E0B', marginBottom: 20 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 14, color: text }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 17, color: text2 }}>Start free forever. Upgrade only when you need to.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, alignItems: 'stretch' }}>
            {PLANS.map((p, i) => (
              <div key={p.id} id={`plan-${i}`} data-animate style={{
                background: p.highlight ? accent : surface,
                border: `1px solid ${p.highlight ? 'transparent' : border}`,
                borderRadius: 18, padding: '36px 30px',
                position: 'relative',
                transform: p.highlight ? 'scale(1.03)' : 'none',
                boxShadow: p.highlight ? '0 20px 60px rgba(99,102,241,0.45)' : 'none',
                display: 'flex', flexDirection: 'column',
                ...animStyle(`plan-${i}`, i * 100),
              }}>
                {p.highlight && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}>
                    ⭐ Most popular
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.highlight ? 'rgba(255,255,255,0.7)' : text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
                    <span style={{ fontFamily: M, fontSize: 38, fontWeight: 800, color: p.highlight ? '#fff' : text }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: p.highlight ? 'rgba(255,255,255,0.6)' : text3 }}>{p.period}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: p.highlight ? 'rgba(255,255,255,0.75)' : text2 }}>{p.desc}</p>
                </div>

                <div style={{ borderTop: `1px solid ${p.highlight ? 'rgba(255,255,255,0.2)' : border}`, paddingTop: 20, marginBottom: 24, flex: 1 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13.5, color: p.highlight ? 'rgba(255,255,255,0.9)' : text2, alignItems: 'flex-start' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="M20 6L9 17l-5-5" stroke={p.highlight ? '#6EE7B7' : '#10B981'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <a href="/app" className="glow-btn" style={{ display: 'block', textAlign: 'center', padding: '13px', background: p.highlight ? '#fff' : `${accent}18`, color: p.highlight ? accent : accent, borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: p.highlight ? 'none' : `1px solid rgba(99,102,241,0.3)` }}>
                  {p.cta} →
                </a>
              </div>
            ))}
          </div>

          {/* Compare note */}
          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: text3 }}>
            All plans include GST invoicing, expense tracking, financial reports, dark/light mode and mobile access. No hidden fees.
          </p>
        </section>

        {/* ═══ TESTIMONIALS ═══ */}
        <section style={{ background: bg2, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '80px 28px', marginBottom: 100 }}>
          <div style={{ maxWidth: 1160, margin: '0 auto' }}>
            <div id="testi-head" data-animate style={{ textAlign: 'center', marginBottom: 56, ...animStyle('testi-head') }}>
              <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 10, color: text }}>Trusted by Indian businesses</h2>
              <p style={{ fontSize: 16, color: text2 }}>Don't take our word for it.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={t.name} id={`testi-${i}`} data-animate className="card-hover"
                  style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: '28px 24px', ...animStyle(`testi-${i}`, i * 100) }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#F59E0B', fontSize: 16 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 14, color: text2, lineHeight: 1.75, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${t.color}20`, border: `2px solid ${t.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: t.color }}>{t.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: text }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: text3 }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section style={{ maxWidth: 1160, margin: '0 auto 100px', padding: '0 28px' }}>
          <div id="cta" data-animate style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', padding: 'clamp(48px,7vw,80px) 40px', textAlign: 'center', background: `linear-gradient(135deg, ${isDark?'#11142A':'#EEF0FB'} 0%, ${isDark?'#191D3A':'#F5F3FF'} 100%)`, border: `1px solid rgba(99,102,241,0.25)`, ...animStyle('cta') }}>
            {/* Decorative */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }} />

            <div style={{ position: 'relative' }}>
              <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16, color: text }}>
                Ready to simplify your finances?
              </h2>
              <p style={{ fontSize: 18, color: text2, maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
                Join freelancers, consultants and growing businesses worldwide. Free to start — no credit card, no setup, no hidden fees.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/app" className="glow-btn" style={{ padding: '16px 40px', fontSize: 16, fontWeight: 700, color: '#fff', background: accent, borderRadius: 12, textDecoration: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.5)' }}>
                  Create your free account →
                </a>
                <a href="#pricing" style={{ padding: '16px 28px', fontSize: 15, fontWeight: 600, color: text2, background: surface, border: `1px solid ${border2}`, borderRadius: 12, textDecoration: 'none' }}>
                  View pricing
                </a>
              </div>
              <p style={{ marginTop: 20, fontSize: 13, color: text3 }}>Free forever plan available · No credit card required · Ready in 5 minutes</p>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ background: bg2, borderTop: `1px solid ${border}`, padding: '48px 28px 32px' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
              {/* Brand col */}
              <div>
                <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
                  {!logoErr
                    ? <img src="/logo.png" alt="Synergific Books"
                        onError={() => setLogoErr(true)}
                        style={{ height: 28, objectFit: 'contain', display: 'block' }} />
                    : <>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 15, color: text }}>Synergific Books</span>
                      </>
                  }
                </a>
                <p style={{ fontSize: 13.5, color: text2, lineHeight: 1.7, marginBottom: 20, maxWidth: 280 }}>
                  Modern accounting software for growing businesses — GST invoicing, double-entry ledger, expense tracking, financial reports and online payments in one place.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['🔒 Your data, your MongoDB', '⚡ Powered by Razorpay'].map(t => (
                    <span key={t} style={{ fontSize: 11, color: text3, padding: '4px 10px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 99, border: `1px solid ${border}` }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Product */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Product</div>
                {[['Features','#features'],['How it works','#how'],['Pricing','#pricing'],['Log in','/app'],['Sign up free','/app']].map(([l,h]) => (
                  <a key={l} href={h} className="nav-link" style={{ display: 'block', fontSize: 14, color: text2, textDecoration: 'none', marginBottom: 10 }}>{l}</a>
                ))}
              </div>

              {/* Features */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Features</div>
                {['GST Invoicing','GSTR Reports','Payment Portal','Recurring Billing','Expense Tracking','Team Access'].map(f => (
                  <div key={f} style={{ fontSize: 14, color: text2, marginBottom: 10 }}>{f}</div>
                ))}
              </div>

              {/* Legal */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Company</div>
                {['Privacy Policy','Terms of Service','Refund Policy','Contact Us'].map(l => (
                  <a key={l} href="#" className="nav-link" style={{ display: 'block', fontSize: 14, color: text2, textDecoration: 'none', marginBottom: 10 }}>{l}</a>
                ))}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Powered by</div>
                  {['Razorpay Payments', 'MongoDB Atlas', 'Vercel', 'Next.js 14'].map(t => (
                    <div key={t} style={{ fontSize: 13, color: text3, marginBottom: 7 }}>· {t}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 13, color: text3 }}>© {new Date().getFullYear()} Synergific Software Pvt. Ltd. All rights reserved.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <p style={{ fontSize: 13, color: text3 }}>Built with ❤️ by Synergific</p>
                <button onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, background: surface, border: `1px solid ${border}`, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isDark ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}