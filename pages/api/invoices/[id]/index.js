import { connectDB } from '../../../../lib/mongodb'
import Invoice from '../../../../models/Invoice'
import Payment from '../../../../models/Payment'
import OrgConfig from '../../../../models/OrgConfig'
import { postInvoiceRaised, postPaymentReceived } from '../../../../lib/journal'
import { requireAuth } from '../../../../lib/auth'
import { computeWithGst } from '../../../../lib/gst'

async function autoCreateReceipt(orgId, invoice) {
  try {
    const count = await Payment.countDocuments({ orgId })
    const payment = await Payment.create({
      orgId,
      paymentNumber: `RCP-${String(count + 1).padStart(4, '0')}`,
      type: 'Receipt',
      paymentDate: new Date(),
      amount: invoice.total,
      currency: invoice.currency || 'INR',
      party: { name: invoice.customer?.name, email: invoice.customer?.email },
      referenceType: 'Invoice',
      referenceId: invoice._id,
      referenceNumber: invoice.invoiceNumber,
      method: 'Other',
      notes: `Auto-recorded: Invoice ${invoice.invoiceNumber} marked as Paid`,
    })
    // Post journal: DR Cash / CR AR
    await postPaymentReceived(orgId, payment, invoice)
    return payment
  } catch (e) {
    console.error('Auto-receipt error:', e.message)
    return null
  }
}

export default async function handler(req, res) {
  await connectDB()
  const { method, query: { id } } = req
  const __auth = requireAuth(req, res); if (!__auth) return; const orgId = __auth.orgId

  if (method === 'GET') {
    try {
      const invoice = await Invoice.findById(id)
      if (!invoice) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(invoice)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (method === 'PUT') {
    try {
      const prev = await Invoice.findById(id)
      const data = req.body
      if (data.lineItems) {
        const cfg = await OrgConfig.findOne({ orgId }).lean()
        const totals = computeWithGst(data.lineItems, { supplierGstin: cfg?.gstin, customerGstin: data.customer?.gstin })
        data.lineItems = totals.items
        data.subtotal  = totals.subtotal
        data.taxTotal  = totals.taxTotal
        data.cgstTotal = totals.cgstTotal
        data.sgstTotal = totals.sgstTotal
        data.igstTotal = totals.igstTotal
        data.taxType   = totals.taxType
        data.total     = totals.total
      }

      // Mark fully paid
      if (data.status === 'Paid') {
        const total = data.total || prev.total || 0
        data.paidAmount = total
      }

      const invoice = await Invoice.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      if (!invoice) return res.status(404).json({ error: 'Not found' })

      const wasAlreadySent = ['Sent','Overdue','Paid'].includes(prev?.status)
      const wasSent = !wasAlreadySent && invoice.status === 'Sent'
      const wasPaid = prev?.status !== 'Paid' && invoice.status === 'Paid'

      // Auto-post AR + Revenue journal when first sent
      if (wasSent) {
        await postInvoiceRaised(orgId, invoice)
      }

      // Auto-post AR + Revenue if jumping straight to Paid without Sent
      if (wasPaid && !wasAlreadySent) {
        await postInvoiceRaised(orgId, invoice)
      }

      // Auto-create receipt payment when marked Paid
      if (wasPaid) {
        // Only auto-create if no payment already covers full amount
        const existing = await Payment.findOne({ orgId, referenceId: invoice._id, type: 'Receipt' })
        const alreadyCovered = existing && (invoice.paidAmount || 0) >= (invoice.total || 0)
        if (!alreadyCovered) {
          await autoCreateReceipt(orgId, invoice)
        }
      }

      return res.status(200).json(invoice)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (method === 'DELETE') {
    try {
      await Invoice.findByIdAndDelete(id)
      return res.status(200).json({ message: 'Deleted' })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  res.status(405).end()
}