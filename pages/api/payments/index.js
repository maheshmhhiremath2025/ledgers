import { connectDB } from '../../../lib/mongodb'
import Payment from '../../../models/Payment'
import Invoice from '../../../models/Invoice'
import { postPaymentReceived, postPaymentMade } from '../../../lib/journal'
import { requireAuth } from '../../../lib/auth'
import { nextNumber } from '../../../lib/sequence'
import { audit } from '../../../lib/audit'
import { fireWebhook } from '../../../lib/webhooks'

export default async function handler(req, res) {
  await connectDB()
  const __auth = requireAuth(req, res); if (!__auth) return; const orgId = __auth.orgId

  if (req.method === 'GET') {
    try {
      const { type, page = 1, limit = 20, search } = req.query
      const query = { orgId }
      if (type) query.type = type
      if (search) query.$or = [
        { paymentNumber: { $regex: search, $options: 'i' } },
        { 'party.name': { $regex: search, $options: 'i' } },
      ]
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const [payments, total] = await Promise.all([
        Payment.find(query).sort({ paymentDate: -1 }).skip(skip).limit(parseInt(limit)),
        Payment.countDocuments(query),
      ])
      return res.status(200).json({ payments, total })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (!data.paymentNumber) {
        const prefix = data.type === 'Receipt' ? 'RCP' : 'PAY'
        const kind   = data.type === 'Receipt' ? 'receipt' : 'payment'
        data.paymentNumber = await nextNumber(orgId, kind, prefix, 4)
      }
      const payment = await Payment.create(data)

      audit(req, __auth, {
        action: data.type === 'Receipt' ? 'payment.receipt.create' : 'payment.create',
        entityType: 'Payment', entityId: payment._id, entityRef: payment.paymentNumber,
        amount: payment.amount, after: payment.toObject(),
      })
      fireWebhook(orgId, data.type === 'Receipt' ? 'payment.received' : 'payment.made', { payment }).catch(() => {})

      let invoice = null

      // Link to invoice and update paid amount
      if (data.referenceType === 'Invoice' && data.referenceId) {
        invoice = await Invoice.findById(data.referenceId)
        if (invoice) {
          const newPaid = (invoice.paidAmount || 0) + (data.amount || 0)
          invoice.paidAmount = newPaid
          if (newPaid >= invoice.total) invoice.status = 'Paid'
          await invoice.save()
        }
      }

      // Auto-post journal entries
      if (data.type === 'Receipt') {
        await postPaymentReceived(orgId, payment, invoice)
      } else if (data.type === 'Payment') {
        await postPaymentMade(orgId, payment)
      }

      return res.status(201).json(payment)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}