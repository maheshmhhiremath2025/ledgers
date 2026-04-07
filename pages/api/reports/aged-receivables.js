import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import { requireAuth } from '../../../lib/auth'

// Aged Receivables: outstanding invoice balances bucketed by days overdue.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const today = new Date()
  const buckets = {
    current:  { label: 'Current (not yet due)', amount: 0, count: 0, invoices: [] },
    d1_30:    { label: '1–30 days',  amount: 0, count: 0, invoices: [] },
    d31_60:   { label: '31–60 days', amount: 0, count: 0, invoices: [] },
    d61_90:   { label: '61–90 days', amount: 0, count: 0, invoices: [] },
    d90plus:  { label: '90+ days',   amount: 0, count: 0, invoices: [] },
  }

  // Group by customer too
  const byCustomer = {} // name → totals

  const invoices = await Invoice.find({
    orgId,
    status: { $in: ['Sent', 'Partial', 'Overdue', 'Draft'] },
  }).lean()

  for (const inv of invoices) {
    const balance = (inv.total || 0) - (inv.paidAmount || 0)
    if (balance <= 0.01) continue
    const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issueDate || today)
    const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24))

    let key = 'current'
    if (daysOverdue <= 0) key = 'current'
    else if (daysOverdue <= 30) key = 'd1_30'
    else if (daysOverdue <= 60) key = 'd31_60'
    else if (daysOverdue <= 90) key = 'd61_90'
    else key = 'd90plus'

    const slim = {
      _id: inv._id, invoiceNumber: inv.invoiceNumber,
      customer: inv.customer?.name || '—',
      issueDate: inv.issueDate, dueDate: inv.dueDate,
      total: inv.total, paidAmount: inv.paidAmount || 0,
      balance, daysOverdue: Math.max(0, daysOverdue),
    }
    buckets[key].amount += balance
    buckets[key].count++
    buckets[key].invoices.push(slim)

    const cname = slim.customer
    if (!byCustomer[cname]) byCustomer[cname] = { customer: cname, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 }
    byCustomer[cname][key] += balance
    byCustomer[cname].total += balance
  }

  const totalOutstanding = Object.values(buckets).reduce((s, b) => s + b.amount, 0)

  return res.status(200).json({
    asOf: today,
    buckets,
    byCustomer: Object.values(byCustomer).sort((a, b) => b.total - a.total),
    totalOutstanding,
  })
}
