import { connectDB } from '../../../lib/mongodb'
import Payment from '../../../models/Payment'
import Invoice from '../../../models/Invoice'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()

  const __auth = requireAuth(req, res); if (!__auth) return; const orgId = __auth.orgId
  const { invoiceId } = req.query
  if (!invoiceId) return res.status(400).json({ error: 'invoiceId required' })

  const [invoice, payments] = await Promise.all([
    Invoice.findOne({ _id: invoiceId, orgId }),
    Payment.find({ orgId, referenceId: invoiceId, type: 'Receipt' }).sort({ paymentDate: 1 }),
  ])

  if (!invoice) return res.status(404).json({ error: 'Not found' })

  return res.status(200).json({
    invoice,
    payments,
    totalPaid:    invoice.paidAmount || 0,
    balance:      (invoice.total || 0) - (invoice.paidAmount || 0),
    isFullyPaid:  invoice.status === 'Paid',
  })
}