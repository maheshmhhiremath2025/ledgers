import { connectDB } from '../../../lib/mongodb'
import Bill from '../../../models/Bill'
import { requireAuth } from '../../../lib/auth'

// Aged Payables: outstanding vendor bill balances bucketed by days overdue.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const today = new Date()
  const buckets = {
    current:  { label: 'Current (not yet due)', amount: 0, count: 0, bills: [] },
    d1_30:    { label: '1–30 days',  amount: 0, count: 0, bills: [] },
    d31_60:   { label: '31–60 days', amount: 0, count: 0, bills: [] },
    d61_90:   { label: '61–90 days', amount: 0, count: 0, bills: [] },
    d90plus:  { label: '90+ days',   amount: 0, count: 0, bills: [] },
  }

  const byVendor = {}

  const bills = await Bill.find({
    orgId,
    status: { $in: ['Open', 'Partial', 'Overdue', 'Draft'] },
  }).lean()

  for (const b of bills) {
    const balance = (b.total || 0) - (b.paidAmount || 0)
    if (balance <= 0.01) continue
    const due = b.dueDate ? new Date(b.dueDate) : new Date(b.billDate || today)
    const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24))

    let key = 'current'
    if (daysOverdue > 0)  key = 'd1_30'
    if (daysOverdue > 30) key = 'd31_60'
    if (daysOverdue > 60) key = 'd61_90'
    if (daysOverdue > 90) key = 'd90plus'

    const slim = {
      _id: b._id, billNumber: b.billNumber, vendorBillNumber: b.vendorBillNumber,
      vendor: b.vendor?.name || '—',
      billDate: b.billDate, dueDate: b.dueDate,
      total: b.total, paidAmount: b.paidAmount || 0,
      balance, daysOverdue: Math.max(0, daysOverdue),
    }
    buckets[key].amount += balance
    buckets[key].count++
    buckets[key].bills.push(slim)

    const v = slim.vendor
    if (!byVendor[v]) byVendor[v] = { vendor: v, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 }
    byVendor[v][key] += balance
    byVendor[v].total += balance
  }

  const totalOutstanding = Object.values(buckets).reduce((s, b) => s + b.amount, 0)
  return res.status(200).json({
    asOf: today,
    buckets,
    byVendor: Object.values(byVendor).sort((a, b) => b.total - a.total),
    totalOutstanding,
  })
}
