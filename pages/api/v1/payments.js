import { connectDB } from '../../../lib/mongodb'
import Payment from '../../../models/Payment'
import Invoice from '../../../models/Invoice'
import { requireApiKey } from '../../../lib/apikey'
import { nextNumber } from '../../../lib/sequence'
import { fireWebhook } from '../../../lib/webhooks'
import { postPaymentReceived } from '../../../lib/journal'

export default async function handler(req, res) {
  await connectDB()
  const ctx = await requireApiKey(req, res, { writeRequired: req.method === 'POST' })
  if (!ctx) return
  const { orgId } = ctx

  if (req.method === 'GET') {
    const { page = 1, limit = 50 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [data, total] = await Promise.all([
      Payment.find({ orgId }).sort({ paymentDate: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Payment.countDocuments({ orgId }),
    ])
    return res.status(200).json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
  }

  if (req.method === 'POST') {
    try {
      const { invoiceId, amount, paymentMode = 'Bank Transfer', reference, notes } = req.body || {}
      if (!invoiceId || !amount) return res.status(400).json({ error: 'invoiceId and amount required' })
      const invoice = await Invoice.findOne({ _id: invoiceId, orgId })
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
      const balance = (invoice.total || 0) - (invoice.paidAmount || 0)
      const paying = Math.min(parseFloat(amount), balance)
      if (paying <= 0) return res.status(400).json({ error: 'Invoice already paid' })

      const payment = await Payment.create({
        orgId,
        paymentNumber: await nextNumber(orgId, 'receipt', 'RCP', 4),
        type: 'Receipt',
        paymentDate: new Date(),
        amount: paying,
        currency: invoice.currency || 'INR',
        party: { name: invoice.customer?.name, email: invoice.customer?.email },
        referenceType: 'Invoice', referenceId: invoice._id, referenceNumber: invoice.invoiceNumber,
        paymentMode, reference: reference || '', notes: notes || `API payment for ${invoice.invoiceNumber}`,
        status: 'Cleared',
      })
      const newPaid = (invoice.paidAmount || 0) + paying
      invoice.paidAmount = newPaid
      invoice.status = newPaid >= (invoice.total || 0) - 0.01 ? 'Paid' : 'Sent'
      await invoice.save()
      postPaymentReceived(orgId, payment, invoice).catch(() => {})
      fireWebhook(orgId, 'payment.received', { payment, invoice }).catch(() => {})
      return res.status(201).json({ payment, invoice })
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}
