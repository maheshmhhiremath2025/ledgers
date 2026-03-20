import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import Payment from '../../../models/Payment'
import { postPaymentReceived, postInvoiceRaised } from '../../../lib/journal'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const { invoiceId, amount, paymentMode, paymentDate, reference, notes } = req.body

  if (!invoiceId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'invoiceId and a valid amount are required' })
  }

  const invoice = await Invoice.findOne({ _id: invoiceId, orgId })
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
  if (invoice.status === 'Paid') return res.status(400).json({ error: 'Invoice is already fully paid' })

  const balance = (invoice.total || 0) - (invoice.paidAmount || 0)
  const paying  = Math.min(parseFloat(amount), balance) // can't overpay

  try {
    // Create payment record
    const count = await Payment.countDocuments({ orgId })
    const payment = await Payment.create({
      orgId,
      paymentNumber: `RCP-${String(count + 1).padStart(4, '0')}`,
      type: 'Receipt',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: paying,
      currency: invoice.currency || 'INR',
      party: { name: invoice.customer?.name, email: invoice.customer?.email },
      referenceType: 'Invoice',
      referenceId: invoice._id,
      referenceNumber: invoice.invoiceNumber,
      paymentMode: paymentMode || 'Bank Transfer',
      reference: reference || '',
      notes: notes || `Partial payment for ${invoice.invoiceNumber}`,
      status: 'Cleared',
    })

    // Update invoice paid amount
    const newPaidAmount = (invoice.paidAmount || 0) + paying
    const newStatus = newPaidAmount >= (invoice.total || 0) ? 'Paid' : 'Sent'

    // Post journal if invoice not yet raised
    if (!['Sent','Paid','Overdue'].includes(invoice.status)) {
      await postInvoiceRaised(orgId, invoice).catch(() => {})
    }
    await postPaymentReceived(orgId, payment, invoice)

    const updated = await Invoice.findByIdAndUpdate(invoiceId, {
      paidAmount: newPaidAmount,
      status: newStatus,
    }, { new: true })

    return res.status(200).json({
      success: true,
      payment,
      invoice: updated,
      balance: (updated.total || 0) - newPaidAmount,
      isFullyPaid: newStatus === 'Paid',
      message: newStatus === 'Paid'
        ? `Invoice fully paid! ₹${paying.toLocaleString('en-IN', { minimumFractionDigits: 2 })} received.`
        : `Payment of ₹${paying.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded. ₹${((updated.total||0)-newPaidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} remaining.`,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}