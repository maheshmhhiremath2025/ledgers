import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import OrgConfig from '../../../models/OrgConfig'
import nodemailer from 'nodemailer'

const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})

async function sendReminder(invoice, cfg, daysOverdue) {
  const smtpHost = cfg?.smtpHost || process.env.SMTP_HOST
  const smtpUser = cfg?.smtpUser || process.env.SMTP_USER
  const smtpPass = cfg?.smtpPass || process.env.SMTP_PASS
  const smtpFrom = cfg?.smtpFrom || process.env.SMTP_FROM || smtpUser
  const to       = invoice.customer?.email

  if (!smtpHost || !smtpUser || !smtpPass || !to) return false

  const biz = cfg?.businessName || 'Synergific Books'
  const balance = (invoice.total||0) - (invoice.paidAmount||0)

  const urgency = daysOverdue >= 14 ? 'URGENT: ' : daysOverdue >= 7 ? 'Reminder: ' : ''
  const subject = `${urgency}Payment overdue — ${invoice.invoiceNumber} (${fmt(balance)})`

  const transporter = nodemailer.createTransport({
    host: smtpHost, port: cfg?.smtpPort||587,
    secure: cfg?.smtpSecure||false,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  })

  const portalLink = invoice.paymentToken
    ? `${process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'}/pay/${invoice.paymentToken}`
    : null

  await transporter.sendMail({
    from: smtpFrom, to, subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;color:#333">
        <h2 style="color:#EF4444">Payment Overdue</h2>
        <p>Dear ${invoice.customer?.name||'Customer'},</p>
        <p>This is a reminder that invoice <strong>${invoice.invoiceNumber}</strong> is <strong>${daysOverdue} day${daysOverdue!==1?'s':''} overdue</strong>.</p>
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:13px;color:#666">Invoice #</div>
          <div style="font-size:18px;font-weight:700;color:#6366F1">${invoice.invoiceNumber}</div>
          <div style="font-size:13px;color:#666;margin-top:8px">Amount due</div>
          <div style="font-size:24px;font-weight:700;color:#DC2626">${fmt(balance)}</div>
          <div style="font-size:12px;color:#999;margin-top:4px">Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</div>
        </div>
        ${portalLink ? `<a href="${portalLink}" style="display:inline-block;padding:12px 24px;background:#6366F1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">Pay Now →</a>` : ''}
        <p style="color:#666;font-size:13px">If you have already made the payment, please ignore this reminder.</p>
        <p style="color:#666;font-size:13px">For queries, reply to this email.</p>
        <p>Thank you,<br><strong>${biz}</strong></p>
      </div>
    `,
  })
  return true
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return overdue invoices summary
    await connectDB()
    const orgId = req.headers['x-org-id'] || 'default'
    const now = new Date()
    const overdue = await Invoice.find({
      orgId,
      status: { $in: ['Sent','Overdue'] },
      dueDate: { $lt: now },
    }).sort({ dueDate: 1 })

    const withDays = overdue.map(inv => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer,
      dueDate: inv.dueDate,
      total: inv.total,
      paidAmount: inv.paidAmount,
      balance: (inv.total||0) - (inv.paidAmount||0),
      daysOverdue: Math.floor((now - new Date(inv.dueDate)) / (1000*60*60*24)),
      lastReminderAt: inv.lastReminderAt || null,
      reminderCount: inv.reminderCount || 0,
    }))
    return res.status(200).json({ overdue: withDays, count: withDays.length })
  }

  if (req.method === 'POST') {
    await connectDB()
    const orgId = req.headers['x-org-id'] || 'default'
    const { invoiceId, sendToAll } = req.body

    const cfg = await OrgConfig.findOne({ orgId })
    const now = new Date()
    const results = { sent: 0, skipped: 0, errors: [] }

    const query = { orgId, status: { $in: ['Sent','Overdue'] }, dueDate: { $lt: now } }
    if (invoiceId) query._id = invoiceId

    const invoices = await Invoice.find(query)

    for (const inv of invoices) {
      const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / (1000*60*60*24))
      // Don't spam — minimum 3 days between reminders
      if (inv.lastReminderAt) {
        const daysSinceLast = Math.floor((now - new Date(inv.lastReminderAt)) / (1000*60*60*24))
        if (daysSinceLast < 3 && !invoiceId) { results.skipped++; continue }
      }

      try {
        const sent = await sendReminder(inv, cfg, daysOverdue)
        if (sent) {
          await Invoice.findByIdAndUpdate(inv._id, {
            status: 'Overdue',
            lastReminderAt: now,
            $inc: { reminderCount: 1 },
          })
          results.sent++
        } else {
          results.skipped++
        }
      } catch(e) {
        results.errors.push(`${inv.invoiceNumber}: ${e.message}`)
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${results.sent} reminder${results.sent!==1?'s':''}. Skipped ${results.skipped}.`,
      ...results
    })
  }

  res.status(405).end()
}