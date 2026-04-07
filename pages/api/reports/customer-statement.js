import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import Payment from '../../../models/Payment'
import CreditNote from '../../../models/CreditNote'
import { requireAuth } from '../../../lib/auth'

// Customer Statement: chronological list of all transactions for a customer with running balance.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const { customer, from, to } = req.query
  if (!customer) return res.status(400).json({ error: 'customer name required' })

  const start = from ? new Date(from) : new Date(0)
  const end   = to   ? new Date(to)   : new Date()

  const [invoices, payments, creditNotes] = await Promise.all([
    Invoice.find({
      orgId, 'customer.name': customer,
      issueDate: { $gte: start, $lte: end },
    }).lean(),
    Payment.find({
      orgId, type: 'Receipt', 'party.name': customer,
      paymentDate: { $gte: start, $lte: end },
    }).lean(),
    CreditNote.find({
      orgId, 'customer.name': customer,
      date: { $gte: start, $lte: end },
    }).lean(),
  ])

  const txns = []
  for (const i of invoices) {
    txns.push({
      date: i.issueDate, type: 'Invoice', ref: i.invoiceNumber,
      description: `Invoice ${i.invoiceNumber}`,
      debit: i.total || 0, credit: 0,
    })
  }
  for (const p of payments) {
    txns.push({
      date: p.paymentDate, type: 'Payment', ref: p.paymentNumber,
      description: `Payment ${p.paymentNumber}${p.referenceNumber ? ' for ' + p.referenceNumber : ''}`,
      debit: 0, credit: p.amount || 0,
    })
  }
  for (const cn of creditNotes) {
    txns.push({
      date: cn.date, type: 'CreditNote', ref: cn.creditNoteNumber,
      description: `Credit Note ${cn.creditNoteNumber}`,
      debit: 0, credit: cn.total || 0,
    })
  }

  txns.sort((a, b) => new Date(a.date) - new Date(b.date))

  let balance = 0
  for (const t of txns) {
    balance += (t.debit - t.credit)
    t.balance = balance
  }

  return res.status(200).json({
    customer, from: start, to: end,
    transactions: txns,
    closingBalance: balance,
    totalInvoiced: invoices.reduce((s, i) => s + (i.total || 0), 0),
    totalReceived: payments.reduce((s, p) => s + (p.amount || 0), 0),
    totalCredited: creditNotes.reduce((s, c) => s + (c.total || 0), 0),
  })
}
