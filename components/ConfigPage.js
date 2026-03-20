import { useState, useEffect, useRef, createContext, useContext } from 'react'
const ROCtx = createContext(false)
import { Btn, Card, SectionTitle } from './ui'

const TABS = [
  { id: 'business', label: 'Business',   icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'tax',      label: 'Tax & GST',  icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { id: 'bank',     label: 'Bank',       icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'defaults', label: 'Defaults',   icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'email',    label: 'Email',      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
]

const inputStyle = {
  width: '100%', padding: '8px 11px',
  background: 'var(--surface-2)', border: '1px solid var(--border-2)',
  borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)',
  outline: 'none', fontFamily: 'var(--font)', transition: 'border-color 0.15s',
}
const labelStyle = {
  display: 'block', fontSize: 12, color: 'var(--text-3)',
  fontWeight: 500, marginBottom: 5, letterSpacing: '0.02em',
}
const hintStyle = { fontSize: 11, color: 'var(--text-4)', marginTop: 4 }

function Field({ label, value, onChange, type = 'text', placeholder, hint, mono }) {
  const ro = useContext(ROCtx)
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={e => !ro && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={ro}
        style={{ ...inputStyle, fontFamily: mono ? 'var(--mono)' : 'var(--font)', opacity: ro ? 0.6 : 1, cursor: ro ? 'not-allowed' : 'text' }}
        onFocus={e => { if (!ro) { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' } }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }}
      />
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  const ro = useContext(ROCtx)
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea
        value={value || ''}
        onChange={e => !ro && onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        readOnly={ro}
        style={{ ...inputStyle, resize: ro ? 'none' : 'vertical', opacity: ro ? 0.6 : 1, cursor: ro ? 'not-allowed' : 'text' }}
        onFocus={e => { if (!ro) { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' } }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  const ro = useContext(ROCtx)
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        value={value || ''}
        onChange={e => !ro && onChange(e.target.value)}
        disabled={ro}
        style={{ ...inputStyle, cursor: ro ? 'not-allowed' : 'pointer', opacity: ro ? 0.6 : 1 }}
        onFocus={e => { if (!ro) e.target.style.borderColor = 'var(--accent)' }}
        onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
      >
        {options.map(o => <option key={o} value={o} style={{ background: 'var(--bg-2)' }}>{o}</option>)}
      </select>
    </div>
  )
}

function ValidationBadge({ value, length, label }) {
  if (!value) return null
  const valid = value.length === length
  return (
    <div style={{ marginTop: 6, padding: '6px 10px', background: valid ? 'var(--green-dim)' : 'var(--amber-dim)', border: `1px solid ${valid ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 'var(--r)', fontSize: 11, color: valid ? 'var(--green-text)' : 'var(--amber-text)' }}>
      {valid ? `✓ Valid ${label}` : `${label}: ${length - value.length} more character${length - value.length !== 1 ? 's' : ''} needed`}
    </div>
  )
}

export default function ConfigPage({ org, headers, toast, readOnly = false }) {
  const [tab, setTab]       = useState('business')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  // Individual state fields — avoids re-render focus loss
  const [businessName,    setBusinessName]    = useState('')
  const [businessEmail,   setBusinessEmail]   = useState('')
  const [businessPhone,   setBusinessPhone]   = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [logoUrl,         setLogoUrl]         = useState('')
  const [signatureName,   setSignatureName]   = useState('')
  const [signatureTitle,  setSignatureTitle]  = useState('')

  const [gstin,   setGstin]   = useState('')
  const [pan,     setPan]     = useState('')
  const [sacCode, setSacCode] = useState('')

  const [bankName,      setBankName]      = useState('')
  const [bankBranch,    setBankBranch]    = useState('')
  const [accountName,   setAccountName]   = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode,      setIfscCode]      = useState('')
  const [upiId,         setUpiId]         = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState('')

  const [invoicePrefix,   setInvoicePrefix]   = useState('INV')
  const [poPrefix,        setPoPrefix]        = useState('PO')
  const [defaultCurrency, setDefaultCurrency] = useState('INR')
  const [defaultTax,      setDefaultTax]      = useState('18')
  const [defaultTerms,    setDefaultTerms]    = useState('Payment due within 30 days.')
  const [defaultNotes,    setDefaultNotes]    = useState('Thank you for your business!')
  const [footerText,      setFooterText]      = useState('This is a computer-generated invoice.')

  // Email / SMTP
  const [smtpHost,    setSmtpHost]    = useState('')
  const [smtpPort,    setSmtpPort]    = useState('587')
  const [smtpUser,    setSmtpUser]    = useState('')
  const [smtpPass,    setSmtpPass]    = useState('')
  const [smtpFrom,    setSmtpFrom]    = useState('')
  const [smtpSecure,  setSmtpSecure]  = useState(false)
  const [emailSubject, setEmailSubject] = useState('Invoice {{invoiceNumber}} from {{businessName}}')
  const [emailBody,    setEmailBody]    = useState('Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}.\n\n{{notes}}\n\nThank you for your business!\n\n{{businessName}}')
  const [testingEmail, setTestingEmail] = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config', { headers })
      .then(r => r.json())
      .then(d => {
        setBusinessName(d.businessName || '')
        setBusinessEmail(d.businessEmail || '')
        setBusinessPhone(d.businessPhone || '')
        setBusinessAddress(d.businessAddress || '')
        setBusinessWebsite(d.businessWebsite || '')
        setLogoUrl(d.logoUrl || '')
        setSignatureName(d.signatureName || '')
        setSignatureTitle(d.signatureTitle || '')
        setGstin(d.gstin || '')
        setPan(d.pan || '')
        setSacCode(d.sacCode || '')
        setBankName(d.bankName || '')
        setBankBranch(d.bankBranch || '')
        setAccountName(d.accountName || '')
        setAccountNumber(d.accountNumber || '')
        setIfscCode(d.ifscCode || '')
        setUpiId(d.upiId || '')
        setPaymentInstructions(d.paymentInstructions || '')
        setInvoicePrefix(d.invoicePrefix || 'INV')
        setPoPrefix(d.poPrefix || 'PO')
        setDefaultCurrency(d.defaultCurrency || 'INR')
        setDefaultTax(String(d.defaultTax ?? 18))
        setDefaultTerms(d.defaultTerms || 'Payment due within 30 days.')
        setDefaultNotes(d.defaultNotes || 'Thank you for your business!')
        setFooterText(d.footerText || 'This is a computer-generated invoice.')
        setSmtpHost(d.smtpHost || '')
        setSmtpPort(String(d.smtpPort || 587))
        setSmtpUser(d.smtpUser || '')
        setSmtpPass(d.smtpPass || '')
        setSmtpFrom(d.smtpFrom || '')
        setSmtpSecure(d.smtpSecure || false)
        setEmailSubject(d.emailSubject || 'Invoice {{invoiceNumber}} from {{businessName}}')
        setEmailBody(d.emailBody || 'Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}.\n\nThank you for your business!\n\n{{businessName}}')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [org.id])

  const markDirty = setter => v => { if (readOnly) return; setter(v); setDirty(true) }

  const buildPayload = () => ({
    businessName, businessEmail, businessPhone, businessAddress,
    businessWebsite, logoUrl, signatureName, signatureTitle,
    gstin, pan, sacCode,
    bankName, bankBranch, accountName, accountNumber, ifscCode, upiId, paymentInstructions,
    invoicePrefix, poPrefix, defaultCurrency, defaultTax: parseFloat(defaultTax) || 0,
    defaultTerms, defaultNotes, footerText,
    smtpHost, smtpPort: parseInt(smtpPort)||587, smtpUser, smtpPass, smtpFrom, smtpSecure,
    emailSubject, emailBody,
  })

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error('Save failed')
      setDirty(false)
      toast('Configuration saved!')
    } catch (e) {
      toast(e.message || 'Save failed', 'error')
    }
    setSaving(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500000) { toast('Logo must be under 500KB', 'error'); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setLogoUrl(dataUrl)
      setDirty(true)
      setUploading(false)
      toast('Logo uploaded — click Save to apply')
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => { setLogoUrl(''); setDirty(true) }

  if (loading) return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 12 }} />)}
    </div>
  )

  function SaveBar() {
    const ro = useContext(ROCtx)
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', gap: 10, alignItems: 'center' }}>
        {dirty && (
          <span style={{ fontSize: 12, color: 'var(--amber-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
            Unsaved changes
          </span>
        )}
        <Btn variant="primary" onClick={save} disabled={saving || !dirty || ro}>
          {saving ? 'Saving…' : '✓ Save Changes'}
        </Btn>
      </div>
    )
  }
  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>Configuration</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            Your org details auto-appear on all invoices &amp; PDFs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!readOnly && dirty && <span style={{ fontSize: 12, color: 'var(--amber-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
            Unsaved
          </span>}
          {!readOnly && (
            <Btn variant="primary" onClick={save} disabled={saving || !dirty}>
              {saving ? 'Saving…' : '✓ Save'}
            </Btn>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '172px 1fr', gap: 20 }}>
        {/* Tab sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
              background: tab === t.id ? 'var(--accent-dim)' : 'transparent',
              color: tab === t.id ? 'var(--accent-2)' : 'var(--text-3)',
              border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
              fontWeight: tab === t.id ? 600 : 400, fontSize: 13,
              outline: tab === t.id ? '1px solid rgba(99,102,241,0.2)' : 'none',
              transition: 'all 0.12s', textAlign: 'left', fontFamily: 'var(--font)',
            }}
              onMouseEnter={e => { if (tab !== t.id) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' } }}
              onMouseLeave={e => { if (tab !== t.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' } }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}

          {/* Live preview */}
          <div style={{ marginTop: 16, padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Preview</div>
            {logoUrl
              ? <img src={logoUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: 40, objectFit: 'contain', marginBottom: 6, display: 'block' }} />
              : <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>{businessName || org.name}</div>
            }
            {gstin && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginBottom: 2 }}>GST: {gstin}</div>}
            {bankName && <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 1 }}>{bankName}</div>}
            {ifscCode && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>IFSC: {ifscCode}</div>}
            {!gstin && !bankName && <div style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic' }}>Fill details to preview</div>}
          </div>
        </div>

        {/* Content */}
        <div>

          {/* ── BUSINESS TAB ── */}
          {tab === 'business' && (
            <Card style={{ padding: 20 }}>
              {/* Logo Upload */}
              <SectionTitle>Company Logo</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 80, height: 60, borderRadius: 'var(--r-md)', border: '1px dashed var(--border-3)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {logoUrl
                    ? <img src={logoUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                    {logoUrl ? 'Logo uploaded ✓' : 'Upload your company logo'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                    PNG, JPG or SVG · Max 500KB · Replaces company name in PDF header
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                    {!readOnly && (
                      <Btn size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Uploading…' : logoUrl ? '↑ Replace Logo' : '↑ Upload Logo'}
                      </Btn>
                    )}
                    {logoUrl && !readOnly && <Btn size="sm" variant="danger" onClick={removeLogo}>Remove</Btn>}
                  </div>
                </div>
              </div>

              <SectionTitle>Business Info</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Business Name *" value={businessName} onChange={markDirty(setBusinessName)} placeholder="Acme Corp Pvt. Ltd." />
                </div>
                <Field label="Email" value={businessEmail} onChange={markDirty(setBusinessEmail)} type="email" placeholder="accounts@acme.com" />
                <Field label="Phone" value={businessPhone} onChange={markDirty(setBusinessPhone)} placeholder="+91 98765 43210" />
                <div style={{ gridColumn: '1/-1' }}>
                  <TextArea label="Address" value={businessAddress} onChange={markDirty(setBusinessAddress)} rows={2} placeholder="123, Business Park, Koramangala, Bengaluru - 560034" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Website" value={businessWebsite} onChange={markDirty(setBusinessWebsite)} placeholder="https://acme.com" />
                </div>
              </div>

              <SectionTitle>Authorized Signatory</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Name" value={signatureName} onChange={markDirty(setSignatureName)} placeholder="Mahesh Kumar" />
                <Field label="Designation" value={signatureTitle} onChange={markDirty(setSignatureTitle)} placeholder="Director / CEO" />
              </div>
              <SaveBar />
            </Card>
          )}

          {/* ── TAX TAB ── */}
          {tab === 'tax' && (
            <Card style={{ padding: 20 }}>
              <SectionTitle>GST & Tax Registration</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="GSTIN" value={gstin} onChange={v => { markDirty(setGstin)(v.toUpperCase()) }} placeholder="22AAAAA0000A1Z5" mono hint="15-character GST Identification Number" />
                  <ValidationBadge value={gstin} length={15} label="GSTIN" />
                </div>
                <div>
                  <Field label="PAN Number" value={pan} onChange={v => { markDirty(setPan)(v.toUpperCase()) }} placeholder="AAAAA0000A" mono hint="10-character PAN" />
                  <ValidationBadge value={pan} length={10} label="PAN" />
                </div>
                <Field label="SAC Code" value={sacCode} onChange={markDirty(setSacCode)} placeholder="998314" mono hint="Service Accounting Code — appears on invoice" />
              </div>

              <div style={{ marginTop: 16, padding: '13px 15px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 3 }}>ℹ️ Appears on every invoice PDF</div>
                GSTIN and PAN print in the invoice header. SAC Code appears in invoice details. CIN and MSME fields have been removed — if you need them, they can be added to your footer text in Defaults.
              </div>
              <SaveBar />
            </Card>
          )}

          {/* ── BANK TAB ── */}
          {tab === 'bank' && (
            <Card style={{ padding: 20 }}>
              <SectionTitle>Bank Account</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <Field label="Bank Name" value={bankName} onChange={markDirty(setBankName)} placeholder="HDFC Bank" />
                <Field label="Branch" value={bankBranch} onChange={markDirty(setBankBranch)} placeholder="Koramangala, Bengaluru" />
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Account Name" value={accountName} onChange={markDirty(setAccountName)} placeholder="Acme Corp Pvt. Ltd." />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Account Number" value={accountNumber} onChange={markDirty(setAccountNumber)} placeholder="50100123456789" mono />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="IFSC Code" value={ifscCode} onChange={v => { markDirty(setIfscCode)(v.toUpperCase()) }} placeholder="HDFC0001234" mono />
                  <ValidationBadge value={ifscCode} length={11} label="IFSC" />
                </div>
              </div>

              <SectionTitle>UPI <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)' }}>(optional)</span></SectionTitle>
              <div style={{ marginBottom: 16 }}>
                <Field label="" value={upiId} onChange={markDirty(setUpiId)} placeholder="acmecorp@hdfcbank — leave blank to hide from invoice" mono />
                {upiId && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--green-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                    UPI ID will appear on invoice
                  </div>
                )}
              </div>

              <SectionTitle>Payment Instructions <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)' }}>(optional)</span></SectionTitle>
              <TextArea value={paymentInstructions} onChange={markDirty(setPaymentInstructions)} rows={2} placeholder="Please transfer to the above account within due date. Add invoice number as reference." />

              {/* Bank preview */}
              {(bankName || accountNumber || ifscCode) && (
                <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>How it appears on invoice PDF</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 14px', fontSize: 12 }}>
                    {[
                      ['Bank', bankName, false],
                      ['Account Name', accountName, false],
                      ['Account No.', accountNumber, true],
                      ['IFSC', ifscCode, true],
                      ['Branch', bankBranch, false],
                      ['UPI', upiId, true],
                    ].filter(([, v]) => v).map(([l, v, mono]) => [
                      <span key={l+'l'} style={{ color: 'var(--text-3)' }}>{l}</span>,
                      <span key={l+'v'} style={{ color: 'var(--text)', fontFamily: mono ? 'var(--mono)' : 'inherit', fontWeight: 500 }}>{v}</span>
                    ])}
                  </div>
                </div>
              )}
              <SaveBar />
            </Card>
          )}

          {/* ── DEFAULTS TAB ── */}
          {tab === 'defaults' && (
            <Card style={{ padding: 20 }}>
              <SectionTitle>Numbering</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                <Field label="Invoice Prefix" value={invoicePrefix} onChange={markDirty(setInvoicePrefix)} placeholder="INV" hint="→ INV-0001" />
                <Field label="PO Prefix" value={poPrefix} onChange={markDirty(setPoPrefix)} placeholder="PO" hint="→ PO-0001" />
                <SelectField label="Currency" value={defaultCurrency} onChange={markDirty(setDefaultCurrency)} options={['INR','USD','EUR','GBP','AED','SGD']} />
                <Field label="Default Tax %" value={defaultTax} onChange={markDirty(setDefaultTax)} type="number" placeholder="18" />
              </div>
              <SectionTitle>Default Invoice Text</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
                <TextArea label="Terms & Conditions" value={defaultTerms} onChange={markDirty(setDefaultTerms)} rows={3} placeholder="Payment due within 30 days." />
                <TextArea label="Notes" value={defaultNotes} onChange={markDirty(setDefaultNotes)} rows={2} placeholder="Thank you for your business!" />
                <TextArea label="PDF Footer Text" value={footerText} onChange={markDirty(setFooterText)} rows={2} placeholder="This is a computer-generated invoice. No signature required." />
              </div>
              <SaveBar />
            </Card>
          )}

          {tab === 'email' && (
            <Card style={{ padding: 20 }}>

              <SectionTitle>Choose Provider</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { id:'gmail',     name:'Gmail',     icon:'✉',  color:'#EA4335', bg:'rgba(234,67,53,0.08)',   border:'rgba(234,67,53,0.25)',   host:'smtp.gmail.com',       port:'587', secure:false },
                  { id:'outlook',   name:'Outlook',   icon:'📨', color:'#0078D4', bg:'rgba(0,120,212,0.08)',   border:'rgba(0,120,212,0.25)',   host:'smtp.office365.com',   port:'587', secure:false },
                  { id:'sendgrid',  name:'SendGrid',  icon:'⚡', color:'#1A82E2', bg:'rgba(26,130,226,0.08)',  border:'rgba(26,130,226,0.25)',  host:'smtp.sendgrid.net',    port:'587', secure:false },
                  { id:'custom',    name:'Custom',    icon:'⚙',  color:'#9EA3BF', bg:'rgba(158,163,191,0.08)', border:'rgba(158,163,191,0.2)', host:'',                     port:'587', secure:false },
                ].map(p => {
                  const knownHosts = ['smtp.gmail.com','smtp.office365.com','smtp.sendgrid.net']
                  const active = smtpHost === p.host || (p.id === 'custom' && smtpHost && !knownHosts.includes(smtpHost))
                  return (
                    <button key={p.id} type="button" onClick={() => { if (p.id !== 'custom') { setSmtpHost(p.host); setSmtpPort(p.port); setSmtpSecure(p.secure); setDirty(true) } }}
                      style={{ padding:'12px 14px', borderRadius:'var(--r-md)', cursor:'pointer', border:`1px solid ${active ? p.color : 'var(--border-2)'}`, background: active ? p.bg : 'var(--surface-2)', transition:'all 0.15s', textAlign:'left', fontFamily:'var(--font)' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = p.border }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border-2)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                        <span style={{ fontSize:16 }}>{p.icon}</span>
                        <span style={{ fontSize:13, fontWeight:600, color: active ? p.color : 'var(--text)' }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>
                        {p.id==='gmail' ? 'App Password' : p.id==='outlook' ? 'Your password' : p.id==='sendgrid' ? 'user = apikey' : 'Manual setup'}
                      </div>
                    </button>
                  )
                })}
              </div>

              {smtpHost === 'smtp.gmail.com' && (
                <div style={{ padding:'12px 16px', background:'rgba(234,67,53,0.08)', border:'1px solid rgba(234,67,53,0.2)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, lineHeight:1.7 }}>
                  <div style={{ fontWeight:700, color:'#EA4335', marginBottom:6 }}>✉ Gmail — App Password required</div>
                  <div style={{ color:'var(--text-2)' }}>
                    <b style={{ color:'var(--text)' }}>Step 1:</b> Go to myaccount.google.com → Security<br/>
                    <b style={{ color:'var(--text)' }}>Step 2:</b> Enable 2-Step Verification (required)<br/>
                    <b style={{ color:'var(--text)' }}>Step 3:</b> Search "App passwords" → Create → Name it "Synergific Books"<br/>
                    <b style={{ color:'var(--text)' }}>Step 4:</b> Copy the 16-char password → paste below as your password<br/>
                    <span style={{ color:'var(--text-3)', display:'block', marginTop:4 }}>⚠ Do NOT use your regular Gmail login password — it won't work.</span>
                  </div>
                </div>
              )}

              {smtpHost === 'smtp.office365.com' && (
                <div style={{ padding:'12px 16px', background:'rgba(0,120,212,0.08)', border:'1px solid rgba(0,120,212,0.2)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, lineHeight:1.7 }}>
                  <div style={{ fontWeight:700, color:'#0078D4', marginBottom:6 }}>📨 Outlook / Microsoft 365</div>
                  <div style={{ color:'var(--text-2)' }}>
                    <b style={{ color:'var(--text)' }}>Username:</b> Your full email — e.g. you@outlook.com or you@company.com<br/>
                    <b style={{ color:'var(--text)' }}>Password:</b> Your regular Microsoft account password<br/>
                    <span style={{ color:'var(--text-3)', display:'block', marginTop:4 }}>Works with Outlook.com, Hotmail, Live, and Microsoft 365 business accounts. If MFA is enabled, create an App Password in your Microsoft account settings.</span>
                  </div>
                </div>
              )}

              {smtpHost === 'smtp.sendgrid.net' && (
                <div style={{ padding:'12px 16px', background:'rgba(26,130,226,0.08)', border:'1px solid rgba(26,130,226,0.2)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, lineHeight:1.7 }}>
                  <div style={{ fontWeight:700, color:'#1A82E2', marginBottom:6 }}>⚡ SendGrid</div>
                  <div style={{ color:'var(--text-2)' }}>
                    <b style={{ color:'var(--text)' }}>Username:</b> Always the literal word <code style={{ background:'var(--surface-3)', padding:'1px 5px', borderRadius:3, fontFamily:'var(--mono)' }}>apikey</code><br/>
                    <b style={{ color:'var(--text)' }}>Password:</b> Your SendGrid API key (starts with SG.)<br/>
                    <b style={{ color:'var(--text)' }}>From:</b> Must be a verified sender in your SendGrid account
                  </div>
                </div>
              )}

              <SectionTitle>SMTP Settings</SectionTitle>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14, marginBottom:14 }}>
                <Field label="SMTP Host" value={smtpHost} onChange={markDirty(setSmtpHost)} placeholder="smtp.gmail.com" />
                <Field label="Port" value={smtpPort} onChange={markDirty(setSmtpPort)} placeholder="587" type="number" />
                <div>
                  <label style={{ display:'block', fontSize:12, color:'var(--text-3)', fontWeight:500, marginBottom:5 }}>Secure (SSL)</label>
                  <div style={{ display:'flex', alignItems:'center', gap:8, height:38 }}>
                    <input type="checkbox" checked={smtpSecure} onChange={e => { setSmtpSecure(e.target.checked); setDirty(true) }} style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--accent)' }} />
                    <span style={{ fontSize:12, color:'var(--text-2)' }}>Use SSL/TLS (port 465)</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <Field label={smtpHost==='smtp.sendgrid.net' ? 'Username (type: apikey)' : 'Email / Username'}
                  value={smtpUser} onChange={markDirty(setSmtpUser)}
                  placeholder={smtpHost==='smtp.sendgrid.net' ? 'apikey' : smtpHost==='smtp.office365.com' ? 'you@outlook.com' : 'you@gmail.com'} />
                <Field label={smtpHost==='smtp.gmail.com' ? 'App Password (16 chars)' : smtpHost==='smtp.sendgrid.net' ? 'API Key (SG.xxx...)' : 'Password'}
                  value={smtpPass} onChange={markDirty(setSmtpPass)}
                  placeholder={smtpHost==='smtp.gmail.com' ? 'xxxx xxxx xxxx xxxx' : '••••••••'} type="password" />
              </div>
              <Field label="From Address" value={smtpFrom} onChange={markDirty(setSmtpFrom)}
                placeholder={smtpHost==='smtp.gmail.com' ? 'Synergific Books <you@gmail.com>' : smtpHost==='smtp.office365.com' ? 'Synergific Books <you@outlook.com>' : 'Synergific Books <accounts@company.com>'}
                hint="How recipients see the sender — e.g. Synergific Books <accounts@acme.com>" />

              <div style={{ marginTop:20 }}>
                <SectionTitle>Email Template</SectionTitle>
                <div style={{ padding:'10px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r)', marginBottom:12, fontSize:11, color:'var(--text-3)', lineHeight:1.6 }}>
                  Variables:&nbsp;
                  {['invoiceNumber','customerName','amount','businessName','dueDate','notes'].map(v => (
                    <code key={v} style={{ background:'var(--surface-3)', padding:'1px 5px', borderRadius:3, fontFamily:'var(--mono)', marginRight:4 }}>{`{{${v}}}`}</code>
                  ))}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:16 }}>
                  <Field label="Email Subject" value={emailSubject} onChange={markDirty(setEmailSubject)} placeholder="Invoice {{invoiceNumber}} from {{businessName}}" />
                  <TextArea label="Email Body" value={emailBody} onChange={markDirty(setEmailBody)} rows={6} placeholder="Dear {{customerName}},..." />
                </div>
              </div>

              {smtpHost && smtpUser && smtpPass ? (
                <div style={{ padding:'12px 16px', background:'var(--green-dim)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'var(--r-md)', marginBottom:16, display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', flexShrink:0 }} />
                  <span style={{ color:'var(--green-text)', fontWeight:600 }}>Ready to send</span>
                  <span style={{ color:'var(--text-3)' }}> · Save first, then click ✉ Send on any invoice</span>
                </div>
              ) : (
                <div style={{ padding:'12px 16px', background:'var(--amber-dim)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'var(--r-md)', marginBottom:16, fontSize:12, color:'var(--amber-text)' }}>
                  ⚠ Select a provider and fill your credentials to enable email sending.
                </div>
              )}

              <SaveBar />
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}