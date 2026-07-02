import { connectDB } from '../../../../lib/mongodb'
import Estimate from '../../../../models/Estimate'
import OrgConfig from '../../../../models/OrgConfig'
import { requireAuth } from '../../../../lib/auth'
import { generateDocPdf } from '../../../../lib/docPdf'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query
  const { to, subject, body } = req.body || {}

  const [est, cfg] = await Promise.all([
    Estimate.findOne({ _id: id, orgId }),
    OrgConfig.findOne({ orgId }),
  ])
  if (!est) return res.status(404).json({ error: 'Estimate not found' })

  const recipient = to || est.customer?.email
  if (!recipient) return res.status(400).json({ error: 'No recipient email' })

  const smtpHost = cfg?.smtpHost || process.env.SMTP_HOST
  const smtpUser = cfg?.smtpUser || process.env.SMTP_USER
  const smtpPass = cfg?.smtpPass || process.env.SMTP_PASS
  const smtpPort = Number(cfg?.smtpPort || process.env.SMTP_PORT || 587)
  const smtpFrom = cfg?.smtpFrom || process.env.SMTP_FROM || smtpUser
  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Email not configured. Set SMTP in Configuration.' })
  }

  const pdfBuf = await generateDocPdf({
    title: 'QUOTATION',
    number: est.estimateNumber, status: est.status,
    dateLabel: 'Date', date: est.issueDate,
    dueLabel: 'Valid Until', dueDate: est.expiryDate,
    party: est.customer, partyLabel: 'Quote To',
    lineItems: est.lineItems, subtotal: est.subtotal, taxTotal: est.taxTotal, total: est.total,
    cgstTotal: est.cgstTotal, sgstTotal: est.sgstTotal, igstTotal: est.igstTotal, taxType: est.taxType,
    notes: est.notes, terms: est.terms, currency: est.currency,
  }, cfg ? cfg.toObject() : {})

  const transporter = nodemailer.createTransport({
    host: smtpHost, port: smtpPort, secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  })

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:24px 28px">
      <div style="color:rgba(255,255,255,0.85);font-size:12px;text-transform:uppercase;letter-spacing:0.06em">Quotation from ${cfg?.businessName || ''}</div>
      <div style="color:#fff;font-size:22px;font-weight:700;margin-top:4px">${est.estimateNumber}</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px">
        Amount: <strong style="color:#fff">${(est.currency || 'INR') === 'INR' ? '₹' : ''}${Number(est.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
      </div>
    </div>
    <div style="padding:24px 28px;color:#374151;font-size:14px;line-height:1.7">
      ${(body || `Hi ${est.customer?.name || 'there'},<br><br>Please find our quotation attached. Let us know if you'd like to proceed.`).replace(/\n/g, '<br>')}
    </div>
    <div style="background:#f9fafb;padding:14px 28px;text-align:center;font-size:11px;color:#9CA3AF">${cfg?.businessName || 'HexaLabs Books'}</div>
  </div></body></html>`

  await transporter.sendMail({
    from: smtpFrom, to: recipient,
    subject: subject || `Quotation ${est.estimateNumber} from ${cfg?.businessName || 'us'}`,
    html,
    attachments: [{ filename: `${est.estimateNumber}.pdf`, content: pdfBuf, contentType: 'application/pdf' }],
  })

  // Bump status to Sent if it was Draft
  if (est.status === 'Draft') { est.status = 'Sent'; await est.save() }

  return res.status(200).json({ ok: true, sentTo: recipient })
}
