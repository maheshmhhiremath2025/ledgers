import { connectDB } from '../../../lib/mongodb'
import Bill from '../../../models/Bill'
import Invoice from '../../../models/Invoice'
import { requireAuth } from '../../../lib/auth'

// TDS Summary: total TDS deducted on bills (we deducted from vendors)
// and TDS on invoices (deducted from us by customers).
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const { from, to } = req.query
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), 3, 1)
  const end   = to   ? new Date(to)   : new Date()

  const [bills, invoices] = await Promise.all([
    Bill.find({ orgId, billDate: { $gte: start, $lte: end }, tdsAmount: { $gt: 0 } }).lean(),
    Invoice.find({ orgId, issueDate: { $gte: start, $lte: end }, tdsAmount: { $gt: 0 } }).lean(),
  ])

  const deductedBySection = {} // section → { count, taxable, tds }
  for (const b of bills) {
    const sec = b.tdsSection || 'Unknown'
    if (!deductedBySection[sec]) deductedBySection[sec] = { section: sec, count: 0, taxable: 0, tds: 0 }
    deductedBySection[sec].count++
    deductedBySection[sec].taxable += b.subtotal || 0
    deductedBySection[sec].tds     += b.tdsAmount || 0
  }
  const collectedBySection = {}
  for (const i of invoices) {
    const sec = i.tdsSection || 'Unknown'
    if (!collectedBySection[sec]) collectedBySection[sec] = { section: sec, count: 0, taxable: 0, tds: 0 }
    collectedBySection[sec].count++
    collectedBySection[sec].taxable += i.subtotal || 0
    collectedBySection[sec].tds     += i.tdsAmount || 0
  }

  return res.status(200).json({
    from: start, to: end,
    deductedFromVendors: {
      bySection: Object.values(deductedBySection),
      total: bills.reduce((s, b) => s + (b.tdsAmount || 0), 0),
      bills: bills.map(b => ({ _id: b._id, billNumber: b.billNumber, vendor: b.vendor?.name, date: b.billDate, taxable: b.subtotal, tdsRate: b.tdsRate, tdsAmount: b.tdsAmount, section: b.tdsSection })),
    },
    deductedByCustomers: {
      bySection: Object.values(collectedBySection),
      total: invoices.reduce((s, i) => s + (i.tdsAmount || 0), 0),
      invoices: invoices.map(i => ({ _id: i._id, invoiceNumber: i.invoiceNumber, customer: i.customer?.name, date: i.issueDate, taxable: i.subtotal, tdsRate: i.tdsRate, tdsAmount: i.tdsAmount, section: i.tdsSection })),
    },
  })
}
