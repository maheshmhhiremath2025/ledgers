import { connectDB } from '../../../lib/mongodb'
import Payment from '../../../models/Payment'
import Invoice from '../../../models/Invoice'
import { postPaymentReceived, postPaymentMade } from '../../../lib/journal'

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

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
        const count = await Payment.countDocuments({ orgId })
        const prefix = data.type === 'Receipt' ? 'RCP' : 'PAY'
        data.paymentNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`
      }
      const payment = await Payment.create(data)

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