import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import OrgConfig from '../../../models/OrgConfig'
import nodemailer from 'nodemailer'

// Build PDF HTML inline (reuse the invoice PDF template logic)
async function getInvoicePDFHtml(invoice, cfg) {
  // Call internal PDF route to get HTML
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const orgId = cfg?.orgId || 'default'
  try {
    const r = await fetch(`${baseUrl}/api/invoices/${invoice._id}/pdf?orgId=${orgId}`)
    if (r.ok) return await r.text()
  } catch {}
  return null
}

function fillTemplate(template, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, 'g'), v || ''), template)
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

  // Check SMTP configured
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

  const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const vars = {
    invoiceNumber: invoice.invoiceNumber,
    businessName:  cfg?.businessName || 'Synergific',
    customerName:  invoice.customer?.name || 'Customer',
    amount:        fmt(invoice.total),
    dueDate:       invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '',
    notes:         invoice.notes || '',
    terms:         invoice.terms || '',
  }

  const finalSubject = fillTemplate(subject || cfg?.emailSubject || 'Invoice {{invoiceNumber}} from {{businessName}}', vars)
  const finalBody    = fillTemplate(body    || cfg?.emailBody    || 'Please find attached invoice {{invoiceNumber}} for {{amount}}.', vars)

  // Get PDF HTML
  const pdfHtml = await getInvoicePDFHtml(invoice, cfg)

  try {
    const transporter = nodemailer.createTransport({
      host:   smtpHost,
      port:   Number(smtpPort),
      secure: cfg?.smtpSecure || smtpPort == 465,
      auth:   { user: smtpUser, pass: smtpPass },
      tls:    { rejectUnauthorized: false },
    })

    const mailOptions = {
      from:    smtpFrom,
      to,
      cc:      cc || undefined,
      subject: finalSubject,
      text:    finalBody,
      html:    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;max-width:600px">
        ${finalBody.replace(/\n/g, '<br>')}
        <br><br>
        <div style="padding:16px;background:#f8f9fa;border-radius:8px;border-left:4px solid #6366F1">
          <strong style="color:#6366F1">${invoice.invoiceNumber}</strong><br>
          Amount: <strong>${fmt(invoice.total)}</strong><br>
          ${invoice.dueDate ? `Due: <strong>${vars.dueDate}</strong>` : ''}
        </div>
        ${pdfHtml ? '<br><p style="color:#666;font-size:12px">The invoice PDF is attached to this email.</p>' : ''}
      </div>`,
      attachments: pdfHtml ? [{
        filename: `${invoice.invoiceNumber}.html`,
        content:  pdfHtml,
        contentType: 'text/html',
      }] : [],
    }

    await transporter.sendMail(mailOptions)

    // Mark invoice as Sent if it was Draft/Due
    if (['Draft', 'Due'].includes(invoice.status)) {
      await Invoice.findByIdAndUpdate(invoiceId, { status: 'Sent' })
    }

    return res.status(200).json({ success: true, message: `Invoice sent to ${to}` })
  } catch (e) {
    return res.status(500).json({ error: `Email failed: ${e.message}` })
  }
}