import { connectDB } from '../../../lib/mongodb'
import CreditNote from '../../../models/CreditNote'
import Invoice from '../../../models/Invoice'

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    const notes = await CreditNote.find({ orgId }).sort({ createdAt: -1 }).limit(200)
    return res.status(200).json(notes)
  }

  if (req.method === 'POST') {
    try {
      const count  = await CreditNote.countDocuments({ orgId })
      const prefix = 'CN'
      const number = `${prefix}-${String(count + 1).padStart(4, '0')}`

      const { invoiceId, lineItems, reason, notes, date } = req.body

      // Get customer from invoice if linked
      let customer = req.body.customer || {}
      if (invoiceId) {
        const inv = await Invoice.findOne({ _id: invoiceId, orgId })
        if (inv) {
          customer = inv.customer
          // Reduce invoice paid amount if applied
        }
      }

      const subtotal = lineItems.reduce((s, l) => s + (l.qty||1)*(l.rate||0), 0)
      const taxTotal  = lineItems.reduce((s, l) => s + (l.qty||1)*(l.rate||0)*(l.tax||0)/100, 0)
      const total     = subtotal + taxTotal

      const cn = await CreditNote.create({
        orgId, creditNoteNumber: number,
        invoiceId: invoiceId || null,
        invoiceNumber: req.body.invoiceNumber || '',
        customer, date: date ? new Date(date) : new Date(),
        reason, lineItems, subtotal, taxTotal, total,
        status: 'Issued', notes,
      })

      // If linked to invoice, reduce its outstanding
      if (invoiceId) {
        const inv = await Invoice.findOne({ _id: invoiceId, orgId })
        if (inv) {
          const newPaid = Math.min((inv.paidAmount||0) + total, inv.total||0)
          const newStatus = newPaid >= (inv.total||0) ? 'Paid' : inv.status
          await Invoice.findByIdAndUpdate(invoiceId, { paidAmount: newPaid, status: newStatus })
        }
      }

      return res.status(201).json(cn)
    } catch(e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}