import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import Payment from '../../../models/Payment'
import OrgConfig from '../../../models/OrgConfig'
import { postPaymentReceived, postInvoiceRaised } from '../../../lib/journal'

export default async function handler(req, res) {
  await connectDB()
  const { token } = req.query

  if (!token) return res.status(400).json({ error: 'Token required' })

  // GET — return invoice + org info for the portal page
  if (req.method === 'GET') {
    const invoice = await Invoice.findOne({ paymentToken: token })
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    const cfg = await OrgConfig.findOne({ orgId: invoice.orgId })

    return res.status(200).json({
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total: invoice.total,
        paidAmount: invoice.paidAmount || 0,
        subtotal: invoice.subtotal,
        taxTotal: invoice.taxTotal,
        currency: invoice.currency || 'INR',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        customer: invoice.customer,
        lineItems: invoice.lineItems,
        notes: invoice.notes,
        terms: invoice.terms,
      },
      org: {
        businessName: cfg?.businessName || 'HexaLabs',
        logoUrl: cfg?.logoUrl || '',
        gstin: cfg?.gstin || '',
        businessEmail: cfg?.businessEmail || '',
        businessPhone: cfg?.businessPhone || '',
        upiId: cfg?.upiId || '',
      },
      razorpayKeyId: cfg?.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    })
  }

  // POST — create Razorpay order for portal payment
  if (req.method === 'POST') {
    const invoice = await Invoice.findOne({ paymentToken: token })
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    if (invoice.status === 'Paid') return res.status(400).json({ error: 'Invoice already paid' })

    const { action } = req.body

    if (action === 'create-order') {
      const balance = (invoice.total || 0) - (invoice.paidAmount || 0)
      if (balance <= 0) return res.status(400).json({ error: 'No balance due' })
      // Support partial payment amount
      const requestedAmount = req.body.amount ? parseFloat(req.body.amount) : balance
      const payAmount = Math.min(Math.max(requestedAmount, 1), balance)

      const cfg = await OrgConfig.findOne({ orgId: invoice.orgId })
      const rzpKeyId     = cfg?.razorpayKeyId     || process.env.RAZORPAY_KEY_ID
      const rzpKeySecret = cfg?.razorpaySecret     || process.env.RAZORPAY_KEY_SECRET
      if (!rzpKeyId || !rzpKeySecret) return res.status(400).json({ error: 'Payment not configured for this organisation. Please contact the business.' })
      const auth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64')
      const shortId = String(invoice._id).slice(-6)
      const ts = String(Date.now()).slice(-6)
      const receipt = `pay_${shortId}_${ts}` // max 40 chars

      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(payAmount * 100), // paise
          currency: invoice.currency || 'INR',
          receipt,
          notes: { invoiceId: String(invoice._id), invoiceNumber: invoice.invoiceNumber, token },
        }),
      })
      if (!orderRes.ok) {
        const err = await orderRes.json()
        return res.status(500).json({ error: err.error?.description || 'Order creation failed' })
      }
      const order = await orderRes.json()
      return res.status(200).json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: rzpKeyId,
        prefill: { name: invoice.customer?.name, email: invoice.customer?.email },
      })
    }

    if (action === 'verify') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
      const body = `${razorpay_order_id}|${razorpay_payment_id}`
      const verifyCfg = await OrgConfig.findOne({ orgId: invoice.orgId })
      const verifyKeyId  = verifyCfg?.razorpayKeyId || process.env.RAZORPAY_KEY_ID
      const verifySecret = verifyCfg?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET
      const expected = crypto.createHmac('sha256', verifySecret).update(body).digest('hex')
      if (expected !== razorpay_signature) return res.status(400).json({ error: 'Invalid payment signature' })

      // Fetch the actual amount captured from Razorpay (server-side, can't be tampered)
      let paidNow
      try {
        const auth = Buffer.from(`${verifyKeyId}:${verifySecret}`).toString('base64')
        const r = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
          headers: { Authorization: `Basic ${auth}` },
        })
        const pj = await r.json()
        if (!r.ok || pj.status !== 'captured') {
          return res.status(400).json({ error: 'Payment not captured' })
        }
        paidNow = (pj.amount || 0) / 100
      } catch (e) {
        return res.status(500).json({ error: 'Could not verify payment with Razorpay: ' + e.message })
      }

      const balance = (invoice.total || 0) - (invoice.paidAmount || 0)
      // Cap at outstanding balance — never overpay
      if (paidNow > balance + 0.01) paidNow = balance

      // Record payment
      const count = await Payment.countDocuments({ orgId: invoice.orgId })
      const payment = await Payment.create({
        orgId: invoice.orgId,
        paymentNumber: `RCP-${String(count + 1).padStart(4, '0')}`,
        type: 'Receipt',
        paymentDate: new Date(),
        amount: paidNow,
        currency: invoice.currency || 'INR',
        party: { name: invoice.customer?.name || 'Customer', email: invoice.customer?.email },
        referenceType: 'Invoice',
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        paymentMode: 'Other',
        notes: `Online payment via portal · Razorpay ${razorpay_payment_id}`,
      })

      // Update invoice
      const newPaidAmount = (invoice.paidAmount || 0) + paidNow
      invoice.paidAmount = newPaidAmount
      invoice.status = newPaidAmount >= (invoice.total || 0) - 0.01 ? 'Paid' : 'Sent'
      await invoice.save()

      // Post journal entries
      if (!['Sent','Overdue'].includes(invoice.status)) {
        await postInvoiceRaised(invoice.orgId, invoice).catch(() => {})
      }
      await postPaymentReceived(invoice.orgId, payment, invoice)

      return res.status(200).json({ success: true, message: 'Payment successful! Invoice marked as Paid.' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  }

  res.status(405).end()
}