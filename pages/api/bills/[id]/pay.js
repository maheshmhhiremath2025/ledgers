import { connectDB } from '../../../../lib/mongodb'
import Bill from '../../../../models/Bill'
import Payment from '../../../../models/Payment'
import { requireAuth } from '../../../../lib/auth'
import { nextNumber } from '../../../../lib/sequence'
import { audit } from '../../../../lib/audit'
import { postPaymentMade } from '../../../../lib/journal'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  const bill = await Bill.findOne({ _id: id, orgId })
  if (!bill) return res.status(404).json({ error: 'Bill not found' })
  if (bill.status === 'Paid') return res.status(400).json({ error: 'Bill already fully paid' })

  const balance = (bill.total || 0) - (bill.paidAmount || 0)
  const paying  = Math.min(parseFloat(req.body.amount || balance), balance)
  if (paying <= 0) return res.status(400).json({ error: 'Invalid payment amount' })

  const payment = await Payment.create({
    orgId,
    paymentNumber: await nextNumber(orgId, 'payment', 'PAY', 4),
    type: 'Payment',
    paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
    amount: paying,
    currency: bill.currency || 'INR',
    party: { name: bill.vendor?.name || 'Vendor', email: bill.vendor?.email || '' },
    referenceType: 'Bill',
    referenceId: bill._id,
    referenceNumber: bill.billNumber,
    paymentMode: req.body.paymentMode || 'Bank Transfer',
    reference: req.body.reference || '',
    notes: req.body.notes || `Payment for ${bill.billNumber}`,
    status: 'Cleared',
  })

  bill.paidAmount = (bill.paidAmount || 0) + paying
  bill.status = bill.paidAmount >= (bill.total || 0) - 0.01 ? 'Paid' : 'Partial'
  await bill.save()

  postPaymentMade(orgId, payment).catch(e => console.error('[bill pay] journal error:', e.message))

  audit(req, auth, {
    action: 'bill.pay', entityType: 'Bill',
    entityId: bill._id, entityRef: bill.billNumber, amount: paying,
    meta: { paymentId: payment._id, paymentNumber: payment.paymentNumber },
  })

  return res.status(200).json({ bill, payment })
}
