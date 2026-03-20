import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import PurchaseOrder from '../../../models/PurchaseOrder'
import Payment from '../../../models/Payment'
import JournalEntry from '../../../models/JournalEntry'
import { postInvoiceRaised, postPaymentReceived, postPaymentMade } from '../../../lib/journal'

async function autoCreateReceipt(orgId, invoice) {
  const count = await Payment.countDocuments({ orgId })
  const payment = await Payment.create({
    orgId,
    paymentNumber: `RCP-${String(count + 1).padStart(4, '0')}`,
    type: 'Receipt',
    paymentDate: invoice.updatedAt || new Date(),
    amount: invoice.total,
    currency: invoice.currency || 'INR',
    party: { name: invoice.customer?.name || 'Unknown', email: invoice.customer?.email },
    referenceType: 'Invoice',
    referenceId: invoice._id,
    referenceNumber: invoice.invoiceNumber,
    paymentMode: 'Other',
    notes: `Backfilled: Invoice ${invoice.invoiceNumber} was already Paid`,
  })
  await postPaymentReceived(orgId, payment, invoice)
  return payment
}

async function autoCreatePayment(orgId, po) {
  const count = await Payment.countDocuments({ orgId })
  const payment = await Payment.create({
    orgId,
    paymentNumber: `PAY-${String(count + 1).padStart(4, '0')}`,
    type: 'Payment',
    paymentDate: po.updatedAt || new Date(),
    amount: po.total,
    currency: po.currency || 'INR',
    party: { name: po.vendor?.name || 'Unknown', email: po.vendor?.email },
    referenceType: 'PurchaseOrder',
    referenceId: po._id,
    referenceNumber: po.poNumber,
    paymentMode: 'Other',
    notes: `Backfilled: PO ${po.poNumber} was already Paid`,
  })
  await postPaymentMade(orgId, payment)
  return payment
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const results = {
    invoiceJournals: 0,
    invoicePayments: 0,
    poPayments: 0,
    skipped: 0,
    errors: [],
  }

  try {
    // ── 1. Backfill journal entries for sent/paid invoices ──
    const sentInvoices = await Invoice.find({
      orgId,
      status: { $in: ['Sent', 'Paid', 'Overdue'] },
    })

    for (const inv of sentInvoices) {
      const existing = await JournalEntry.findOne({ orgId, sourceId: inv._id, sourceType: 'Invoice' })
      if (existing) { results.skipped++; continue }
      try {
        await postInvoiceRaised(orgId, inv)
        results.invoiceJournals++
      } catch (e) {
        results.errors.push(`Invoice journal ${inv.invoiceNumber}: ${e.message}`)
      }
    }

    // ── 2. Backfill receipt payments for already-paid invoices ──
    const paidInvoices = await Invoice.find({ orgId, status: 'Paid' })

    for (const inv of paidInvoices) {
      const existing = await Payment.findOne({ orgId, referenceId: inv._id, type: 'Receipt' })
      if (existing) { results.skipped++; continue }
      try {
        await autoCreateReceipt(orgId, inv)
        results.invoicePayments++
      } catch (e) {
        results.errors.push(`Invoice payment ${inv.invoiceNumber}: ${e.message}`)
      }
    }

    // ── 3. Backfill payments for already-paid POs ──
    const paidPOs = await PurchaseOrder.find({ orgId, status: 'Paid' })

    for (const po of paidPOs) {
      const existing = await Payment.findOne({ orgId, referenceId: po._id, type: 'Payment' })
      if (existing) { results.skipped++; continue }
      try {
        await autoCreatePayment(orgId, po)
        results.poPayments++
      } catch (e) {
        results.errors.push(`PO payment ${po.poNumber}: ${e.message}`)
      }
    }

    // ── 4. Backfill existing payments that have no journal entries ──
    const payments = await Payment.find({ orgId })
    for (const pmt of payments) {
      const existing = await JournalEntry.findOne({ orgId, sourceId: pmt._id, sourceType: 'Payment' })
      if (existing) { results.skipped++; continue }
      try {
        let invoice = null
        if (pmt.referenceType === 'Invoice' && pmt.referenceId) {
          invoice = await Invoice.findById(pmt.referenceId)
        }
        if (pmt.type === 'Receipt') {
          await postPaymentReceived(orgId, pmt, invoice)
        } else {
          await postPaymentMade(orgId, pmt)
        }
      } catch (e) {
        results.errors.push(`Payment journal ${pmt.paymentNumber}: ${e.message}`)
      }
    }

    const total = results.invoiceJournals + results.invoicePayments + results.poPayments
    return res.status(200).json({
      success: true,
      message: total === 0
        ? `Everything already synced! Skipped ${results.skipped} existing records.`
        : `Synced ${results.invoiceJournals} invoice journals, ${results.invoicePayments} invoice receipts, ${results.poPayments} PO payments. Skipped ${results.skipped} already posted.`,
      ...results,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}