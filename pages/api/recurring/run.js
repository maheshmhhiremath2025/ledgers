import { connectDB } from '../../../lib/mongodb'
import RecurringInvoice from '../../../models/RecurringInvoice'
import RecurringExpense from '../../../models/RecurringExpense'
import Invoice from '../../../models/Invoice'
import Expense from '../../../models/Expense'
import OrgConfig from '../../../models/OrgConfig'
import { postInvoiceRaised } from '../../../lib/journal'
import { nextNumber } from '../../../lib/sequence'

// Compute next run date
function nextDate(from, frequency) {
  const d = new Date(from)
  switch (frequency) {
    case 'Weekly':    d.setDate(d.getDate() + 7);   break
    case 'Monthly':   d.setMonth(d.getMonth() + 1); break
    case 'Quarterly': d.setMonth(d.getMonth() + 3); break
    case 'Yearly':    d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

async function sendInvoiceEmail(invoice, cfg, sendTo) {
  try {
    const smtpHost = cfg?.smtpHost || process.env.SMTP_HOST
    const smtpUser = cfg?.smtpUser || process.env.SMTP_USER
    const smtpPass = cfg?.smtpPass || process.env.SMTP_PASS
    if (!smtpHost || !smtpUser || !smtpPass) return false

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await fetch(`${baseUrl}/api/invoices/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-org-id': invoice.orgId },
      body: JSON.stringify({
        invoiceId: invoice._id,
        to: sendTo || invoice.customer?.email,
      }),
    })
    return true
  } catch { return false }
}

export default async function handler(req, res) {
  // Can be triggered manually (POST from UI) or via cron (GET with secret)
  if (req.method === 'GET') {
    const secret = req.query.secret
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else if (req.method !== 'POST') {
    return res.status(405).end()
  }

  await connectDB()

  const orgId = req.headers['x-org-id'] || req.query.orgId || null
  const now = new Date()
  const results = { created: 0, sent: 0, skipped: 0, errors: [] }

  try {
    // Find all active recurring invoices due to run
    const query = {
      status: 'Active',
      nextRunDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    }
    if (orgId) query.orgId = orgId

    const dueItems = await RecurringInvoice.find(query)

    for (const rec of dueItems) {
      try {
        // Get org config for invoice prefix and SMTP
        const cfg = await OrgConfig.findOne({ orgId: rec.orgId })

        // Generate invoice number
        const count = await Invoice.countDocuments({ orgId: rec.orgId })
        const prefix = cfg?.invoicePrefix || 'INV'
        const invNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`

        // Build due date
        const issueDate = new Date()
        const dueDate   = new Date()
        dueDate.setDate(dueDate.getDate() + (rec.template.dueDays || 30))

        // Calc line item totals
        let subtotal = 0, taxTotal = 0
        const lineItems = (rec.template.lineItems || []).map(item => {
          const amount = (item.qty || 0) * (item.rate || 0)
          const taxAmt = (amount * (item.tax || 0)) / 100
          subtotal += amount; taxTotal += taxAmt
          return { ...item.toObject?.() || item, amount }
        })

        // Create the invoice
        const invoice = await Invoice.create({
          orgId: rec.orgId,
          invoiceNumber: invNumber,
          status: rec.autoSend ? 'Sent' : 'Draft',
          customer: rec.template.customer,
          lineItems,
          subtotal, taxTotal,
          total: subtotal + taxTotal,
          paidAmount: 0,
          issueDate, dueDate,
          currency: rec.template.currency || 'INR',
          notes: rec.template.notes || '',
          terms: rec.template.terms || '',
          template: rec.template.invoiceTemplate || 'classic',
          recurringId: rec._id,
        })

        results.created++

        // Post journal entry
        if (rec.autoSend) {
          await postInvoiceRaised(rec.orgId, invoice).catch(() => {})
        }

        // Auto-send email if configured
        if (rec.autoSend && (rec.autoSendTo || rec.template.customer?.email)) {
          const sent = await sendInvoiceEmail(invoice, cfg, rec.autoSendTo)
          if (sent) results.sent++
        }

        // Update recurring record
        rec.lastRunDate = now
        rec.runCount    = (rec.runCount || 0) + 1
        rec.nextRunDate = nextDate(now, rec.frequency)

        // Check if we've hit the end date
        if (rec.endDate && rec.nextRunDate > rec.endDate) {
          rec.status = 'Cancelled'
        }

        await rec.save()
      } catch (e) {
        results.errors.push(`${rec.name}: ${e.message}`)
      }
    }

    // ── Recurring expenses ──
    const expQuery = { active: true, nextDate: { $lte: now } }
    if (orgId) expQuery.orgId = orgId
    const recExps = await RecurringExpense.find(expQuery)
    let expCreated = 0
    for (const rx of recExps) {
      try {
        const expNumber = await nextNumber(rx.orgId, 'expense', 'EXP', 4)
        const taxAmount = (Number(rx.amount) || 0) * (Number(rx.tax) || 0) / 100
        const total = (Number(rx.amount) || 0) + taxAmount
        await Expense.create({
          orgId: rx.orgId,
          expenseNumber: expNumber,
          date: now,
          category: rx.category || 'Miscellaneous',
          vendor: rx.vendor || '',
          description: rx.description || rx.name,
          amount: rx.amount,
          tax: rx.tax || 0,
          taxAmount,
          total,
          paymentMode: rx.paymentMode || 'Bank Transfer',
          notes: `Auto-generated from recurring: ${rx.name}`,
          status: 'Recorded',
        })
        expCreated++
        // Compute next date
        const nd = new Date(rx.nextDate)
        if (rx.frequency === 'weekly')    nd.setDate(nd.getDate() + 7)
        if (rx.frequency === 'monthly')   nd.setMonth(nd.getMonth() + 1)
        if (rx.frequency === 'quarterly') nd.setMonth(nd.getMonth() + 3)
        if (rx.frequency === 'yearly')    nd.setFullYear(nd.getFullYear() + 1)
        rx.lastRunAt = now
        rx.nextDate  = nd
        rx.generatedCount = (rx.generatedCount || 0) + 1
        if (rx.endDate && nd > rx.endDate) rx.active = false
        await rx.save()
      } catch (e) { results.errors.push(`Expense ${rx.name}: ${e.message}`) }
    }

    return res.status(200).json({
      success: true,
      message: `Created ${results.created} invoices, ${expCreated} expenses, sent ${results.sent} emails. ${results.errors.length} errors.`,
      expensesCreated: expCreated,
      ...results,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}