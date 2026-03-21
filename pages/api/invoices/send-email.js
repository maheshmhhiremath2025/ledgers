import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import OrgConfig from '../../../models/OrgConfig'
import nodemailer from 'nodemailer'

function fillTemplate(template, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, 'g'), v || ''), template)
}

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const { invoiceId, to, subject, body, cc } = req.body

  if (!invoiceId || !to) return res.status(400).json({ error: 'invoiceId and to are required' })

  const [invoice, cfg] = await Promise.all([
    Invoice.findById(invoiceId),
    OrgConfig.findOne({ orgId }),
  ])

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  const smtpHost = cfg?.smtpHost || process.env.SMTP_HOST
  const smtpUser = cfg?.smtpUser || process.env.SMTP_USER
  const smtpPass = cfg?.smtpPass || process.env.SMTP_PASS
  const smtpPort = cfg?.smtpPort || process.env.SMTP_PORT || 587
  const smtpFrom = cfg?.smtpFrom || process.env.SMTP_FROM || smtpUser

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({
      error: 'Email not configured',
      message: 'Please configure SMTP settings in Configuration → Email tab first.',
    })
  }

  const cfgObj = cfg ? (cfg.toObject ? cfg.toObject() : cfg) : {}
  const dueDate = fmtDate(invoice.dueDate)

  const vars = {
    invoiceNumber: invoice.invoiceNumber,
    businessName:  cfgObj.businessName || 'Synergific',
    customerName:  invoice.customer?.name || 'Customer',
    amount:        fmt(invoice.total),
    dueDate,
    // Do NOT include notes here - prevents duplicate text
  }

  const finalSubject = fillTemplate(subject || cfgObj.emailSubject || 'Invoice {{invoiceNumber}} from {{businessName}}', vars)
  // Use emailBody but strip {{notes}} variable to prevent duplication
  const rawBody = body || cfgObj.emailBody || 'Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}.\n\nKindly make the payment by {{dueDate}}.\n\nThank you for your business!\n\n{{businessName}}'
  const finalBody = fillTemplate(rawBody.replace(/\{\{notes\}\}/g, '').replace(/\n{3,}/g, '\n\n'), vars)

  // Generate portal link
  let portalUrl = ''
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ledgers.hexalabs.online'
    const pr = await fetch(`${baseUrl}/api/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
      body: JSON.stringify({ invoiceId }),
    })
    if (pr.ok) { const pd = await pr.json(); portalUrl = pd.url || '' }
  } catch {}

  // Build line items rows
  const lineRows = (invoice.lineItems || []).map((item, i) => {
    const amt = (parseFloat(item.qty)||0) * (parseFloat(item.rate)||0) * (1 + (parseFloat(item.tax)||0)/100)
    return `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:10px 12px;font-size:13px;color:#374151">${i+1}. ${item.description || ''}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:center">${item.qty}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:right">${fmt(item.rate)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:center">${item.tax||0}%</td>
      <td style="padding:10px 12px;font-size:13px;color:#111;font-weight:600;text-align:right">${fmt(amt)}</td>
    </tr>`
  }).join('')

  const subtotal = (invoice.lineItems||[]).reduce((s,l) => s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0), 0)
  const taxTotal  = (invoice.lineItems||[]).reduce((s,l) => s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0)*(parseFloat(l.tax)||0)/100, 0)

  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif">
  <div style="max-width:620px;margin:24px auto">
    <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:28px 32px;border-radius:12px 12px 0 0">
      ${cfgObj.logoUrl ? `<img src="${cfgObj.logoUrl}" alt="${cfgObj.businessName}" style="height:36px;object-fit:contain;margin-bottom:16px;display:block"/>` : ''}
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">Invoice from ${cfgObj.businessName||''}</div>
      <div style="color:#fff;font-size:26px;font-weight:700;margin-bottom:6px">${invoice.invoiceNumber}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px">
        Amount Due: <strong style="color:#fff;font-size:16px">${fmt(invoice.total)}</strong>
        ${dueDate ? `&nbsp;·&nbsp; Due: <strong style="color:#fff">${dueDate}</strong>` : ''}
      </div>
    </div>
    <div style="background:#fff;padding:28px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7">${finalBody.replace(/\n/g,'<br>')}</p>
      ${portalUrl ? `
      <div style="text-align:center;margin:24px 0">
        <a href="${portalUrl}" style="display:inline-block;background:#6366F1;color:#fff;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;box-shadow:0 4px 12px rgba(99,102,241,0.4)">
          👁 View &amp; Pay Invoice
        </a>
      </div>` : ''}
    </div>
    <div style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-top:1px solid #f3f4f6">
      <div style="padding:12px 32px;background:#f9fafb;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Invoice Details</div>
      <div style="display:flex;padding:16px 32px;gap:24px">
        <div style="flex:1">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin-bottom:6px">From</div>
          <div style="font-size:13px;font-weight:700;color:#111">${cfgObj.businessName||''}</div>
          <div style="font-size:12px;color:#6B7280">${cfgObj.businessEmail||''}</div>
          ${cfgObj.gstin ? `<div style="font-size:11px;color:#9CA3AF;margin-top:2px">GST: ${cfgObj.gstin}</div>` : ''}
        </div>
        <div style="flex:1">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin-bottom:6px">Bill To</div>
          <div style="font-size:13px;font-weight:700;color:#111">${invoice.customer?.name||''}</div>
          <div style="font-size:12px;color:#6B7280">${invoice.customer?.email||''}</div>
          ${invoice.customer?.gstin ? `<div style="font-size:11px;color:#9CA3AF;margin-top:2px">GST: ${invoice.customer.gstin}</div>` : ''}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:0">
        <thead>
          <tr style="background:#f9fafb;border-top:1px solid #f0f0f0;border-bottom:1px solid #e5e7eb">
            <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#6B7280;text-align:left;text-transform:uppercase">Description</th>
            <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#6B7280;text-align:center;text-transform:uppercase">Qty</th>
            <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#6B7280;text-align:right;text-transform:uppercase">Rate</th>
            <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#6B7280;text-align:center;text-transform:uppercase">Tax</th>
            <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#6B7280;text-align:right;text-transform:uppercase">Amount</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>
      <div style="padding:16px 32px;border-top:1px solid #e5e7eb">
        <div style="display:flex;justify-content:flex-end">
          <table style="border-collapse:collapse;min-width:260px">
            <tr>
              <td style="padding:5px 12px;font-size:13px;color:#6B7280">Subtotal</td>
              <td style="padding:5px 12px;font-size:13px;color:#111;text-align:right;font-family:monospace">${fmt(subtotal)}</td>
            </tr>
            <tr>
              <td style="padding:5px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #e5e7eb">Tax (GST)</td>
              <td style="padding:5px 12px;font-size:13px;color:#111;text-align:right;font-family:monospace;border-bottom:1px solid #e5e7eb">${fmt(taxTotal)}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;font-size:15px;font-weight:700;color:#6366F1">Total Due</td>
              <td style="padding:10px 12px;font-size:16px;font-weight:700;color:#6366F1;text-align:right;font-family:monospace">${fmt(invoice.total)}</td>
            </tr>
          </table>
        </div>
      </div>
      ${cfgObj.bankName ? `
      <div style="margin:0 32px 16px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
        <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:8px">Bank Details</div>
        <div style="font-size:12px;color:#374151;line-height:1.8">
          Bank: <strong>${cfgObj.bankName}</strong><br>
          Account: <strong>${cfgObj.accountNumber}</strong> &nbsp;·&nbsp; IFSC: <strong>${cfgObj.ifscCode}</strong><br>
          Account Name: <strong>${cfgObj.accountName}</strong>
        </div>
      </div>` : ''}
      ${invoice.notes ? `<div style="margin:0 32px 12px;padding:12px 16px;background:#fffbeb;border-left:3px solid #F59E0B;border-radius:0 4px 4px 0;font-size:12px;color:#374151"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
      ${invoice.terms ? `<div style="margin:0 32px 16px;padding:12px 16px;background:#EEF2FF;border-left:3px solid #6366F1;border-radius:0 4px 4px 0;font-size:12px;color:#374151"><strong>Terms:</strong> ${invoice.terms}</div>` : ''}
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center">
      <div style="font-size:12px;color:#9CA3AF">${cfgObj.businessName||''} · ${cfgObj.businessEmail||''} ${cfgObj.businessPhone ? '· '+cfgObj.businessPhone : ''}</div>
      <div style="font-size:11px;color:#D1D5DB;margin-top:4px">${cfgObj.footerText||'This is a computer-generated invoice.'}</div>
    </div>
  </div>
</body>
</html>`

  try {
    const transporter = nodemailer.createTransport({
      host:   smtpHost,
      port:   Number(smtpPort),
      secure: cfg?.smtpSecure || smtpPort == 465,
      auth:   { user: smtpUser, pass: smtpPass },
      tls:    { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from:    smtpFrom,
      to,
      cc:      cc || undefined,
      subject: finalSubject,
      text:    finalBody,
      html:    emailHtml,
    })

    // Do not auto-change status to Sent — keep the original status selected by user

    return res.status(200).json({ success: true, message: `Invoice sent to ${to}` })
  } catch (e) {
    return res.status(500).json({ error: `Email failed: ${e.message}` })
  }
}