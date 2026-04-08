import Head from 'next/head'
import { useState } from 'react'

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: 0, period: 'Free forever',
    desc: 'Perfect for freelancers just getting started with invoicing.',
    color: '#636880',
    features: [
      ['5 invoices / month', true],
      ['3 purchase orders / month', true],
      ['1 organisation', true],
      ['Classic PDF template', true],
      ['GST-compliant invoices', true],
      ['Chart of accounts', true],
      ['Basic GST reports', true],
      ['Email support', true],
      ['Logo on invoices', false],
      ['Recurring invoices', false],
      ['Team members', false],
    ],
    cta: 'Start free',
  },
  {
    id: 'pro', name: 'Professional', price: 999, period: 'per month', highlight: true,
    desc: 'For growing businesses that need the full invoicing toolkit.',
    color: '#6366F1',
    features: [
      ['Unlimited invoices & POs', true],
      ['All 5 PDF templates', true],
      ['Logo on invoices', true],
      ['GST & bank configuration', true],
      ['Saved customers & vendors', true],
      ['Email delivery (Gmail/Outlook)', true],
      ['Customer payment portal', true],
      ['Recurring invoices', true],
      ['Expense tracking', true],
      ['Estimates & vendor bills', true],
      ['Financial reports (P&L, BS)', true],
      ['5 team members', false],
      ['Role-based access', false],
    ],
    cta: 'Get Professional',
  },
  {
    id: 'biz', name: 'Business', price: 2499, period: 'per month',
    desc: 'For teams, agencies and companies with multiple users.',
    color: '#10B981',
    features: [
      ['Everything in Professional', true],
      ['5 team members', true],
      ['Admin / Accountant / Viewer roles', true],
      ['Fine-grained access control', true],
      ['CSV & Excel export', true],
      ['Overdue auto-reminders', true],
      ['Bulk CSV import', true],
      ['Webhooks & public REST API', true],
      ['Fixed assets & depreciation', true],
      ['Projects & time tracking', true],
      ['Audit log', true],
      ['Priority support', true],
    ],
    cta: 'Get Business',
  },
]

const FAQ = [
  { q: 'Is there a free trial?',
    a: 'The Starter plan is free forever with 5 invoices/month. You can upgrade to Professional or Business any time — no credit card required to sign up.' },
  { q: 'How does billing work?',
    a: 'Plans are billed monthly via Razorpay (UPI, cards, net banking). There is no auto-renewal — you manually renew each month. If you renew early while still active, the new 30 days stack on top of your remaining days.' },
  { q: 'What happens if I don\'t renew?',
    a: 'Your account automatically downgrades to the Starter plan. Your data stays intact — you just lose access to paid features until you renew.' },
  { q: 'Can I change plans later?',
    a: 'Yes. You can upgrade or downgrade at any time from the Billing page inside the app.' },
  { q: 'Is my data safe?',
    a: 'Yes. Data is stored on MongoDB Atlas with encryption at rest, transmitted over HTTPS, and isolated per organisation. Passwords are hashed with PBKDF2 (120k iterations). See our Privacy Policy for details.' },
  { q: 'Do you offer refunds?',
    a: 'Yes, we offer a 7-day refund window on the first month of a paid subscription. See the Refund Policy for full terms.' },
  { q: 'Can I import my existing data?',
    a: 'Yes. Business plan includes bulk CSV import for customers, vendors and products. You can download sample templates from the Import page.' },
  { q: 'Do you support GST e-Invoicing?',
    a: 'Standard GST invoices are fully supported, including CGST/SGST/IGST auto-split based on state codes, GSTR-1 export, and HSN/SAC codes. e-Invoice IRN generation via GSP is on the roadmap.' },
]

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(0)
  const [isDark, setIsDark] = useState(false)

  const bg      = isDark ? '#0A0C18' : '#F0F2F8'
  const surface = isDark ? '#191D3A' : '#FFFFFF'
  const surf2   = isDark ? '#1E2346' : '#F7F8FD'
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.14)'
  const text    = isDark ? '#ECEEF8' : '#0F1729'
  const text2   = isDark ? '#8B90B0' : '#374151'
  const text3   = isDark ? '#4A4E6A' : '#6B7280'
  const accent  = '#6366F1'
  const F = "'DM Sans', system-ui, sans-serif"

  return (
    <>
      <Head>
        <title>Pricing — HexaLabs Books | GST Invoicing Plans from ₹0</title>
        <meta name="description" content="Simple, transparent pricing for HexaLabs Books. Start free with 5 invoices/month, or unlock unlimited invoicing, team access and advanced features from ₹999/month." />
        <link rel="canonical" href="https://ledgers.hexalabs.online/pricing" />
        <meta property="og:title" content="HexaLabs Books Pricing — From ₹0" />
        <meta property="og:description" content="Free forever Starter plan. Professional ₹999/mo. Business ₹2,499/mo. GST-compliant invoicing for India." />
        <meta property="og:url" content="https://ledgers.hexalabs.online/pricing" />
        <meta property="og:image" content="https://ledgers.hexalabs.online/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }) }} />
      </Head>

      <div style={{ background: bg, color: text, fontFamily: F, minHeight: '100vh' }}>

        {/* Nav */}
        <nav style={{ borderBottom: `1px solid ${border}`, background: surface }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: text }}>
              <img src="/logo.png" alt="HexaLabs Books" style={{ height: 30 }} onError={e => e.currentTarget.style.display = 'none'}/>
              <span style={{ fontWeight: 800, fontSize: 16 }}>HexaLabs Books</span>
            </a>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <a href="/#features" style={{ fontSize: 14, color: text2, textDecoration: 'none', fontWeight: 500 }}>Features</a>
              <a href="/pricing" style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 600 }}>Pricing</a>
              <a href="/app" style={{ padding: '9px 18px', background: accent, color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Get started free</a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 28px 40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '7px 16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: accent, marginBottom: 20 }}>Simple, transparent pricing</div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>
            Pricing that scales<br/>with your business
          </h1>
          <p style={{ fontSize: 18, color: text2, marginTop: 18, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto' }}>
            Start free, upgrade when you need more. No hidden fees, no auto-renewal, no credit card required to sign up.
          </p>
        </section>

        {/* Plans */}
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: '20px 28px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{
                background: surface,
                border: `${p.highlight ? 2 : 1}px solid ${p.highlight ? accent : border}`,
                borderRadius: 16, padding: 28, position: 'relative',
                boxShadow: p.highlight ? '0 20px 60px rgba(99,102,241,0.18)' : '0 4px 20px rgba(0,0,0,0.04)',
                transform: p.highlight ? 'translateY(-6px)' : 'none',
              }}>
                {p.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 99, letterSpacing: '0.05em' }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.name}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: text, letterSpacing: '-1px' }}>₹{p.price.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 13, color: text3 }}>{p.period}</span>
                </div>
                <p style={{ fontSize: 13, color: text2, marginTop: 10, lineHeight: 1.6, minHeight: 40 }}>{p.desc}</p>
                <a href="/app" style={{ display: 'block', textAlign: 'center', marginTop: 18, padding: '12px 16px', background: p.highlight ? accent : 'transparent', color: p.highlight ? '#fff' : text, border: `1px solid ${p.highlight ? accent : border}`, borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>{p.cta}</a>
                <div style={{ height: 1, background: border, margin: '22px 0' }}/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {p.features.map(([label, included]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: included ? text2 : text3, opacity: included ? 1 : 0.55 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: included ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.1)', color: included ? '#10B981' : text3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          {included ? <path d="M5 13l4 4L19 7"/> : <path d="M18 6L6 18M6 6l12 12"/>}
                        </svg>
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 780, margin: '0 auto', padding: '40px 28px 80px' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 32, letterSpacing: '-0.8px' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{ width: '100%', padding: '18px 22px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: F, color: text, fontSize: 15, fontWeight: 600 }}>
                  {f.q}
                  <span style={{ fontSize: 22, color: text3, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 22px 20px', fontSize: 14, color: text2, lineHeight: 1.7 }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: surf2, borderTop: `1px solid ${border}`, padding: '60px 28px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Ready to get started?</h2>
          <p style={{ fontSize: 15, color: text2, marginTop: 10 }}>Create your first GST invoice in under 60 seconds. No credit card required.</p>
          <a href="/app" style={{ display: 'inline-block', marginTop: 22, padding: '14px 32px', background: accent, color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: 15, fontWeight: 700, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>Start free now →</a>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${border}`, padding: '28px', textAlign: 'center', fontSize: 12, color: text3 }}>
          <div style={{ marginBottom: 8 }}>
            <a href="/terms" style={{ color: text3, textDecoration: 'none', margin: '0 10px' }}>Terms</a>
            <a href="/privacy" style={{ color: text3, textDecoration: 'none', margin: '0 10px' }}>Privacy</a>
            <a href="/refund" style={{ color: text3, textDecoration: 'none', margin: '0 10px' }}>Refund</a>
          </div>
          © {new Date().getFullYear()} HexaLabs. All rights reserved.
        </footer>
      </div>
    </>
  )
}
