import { connectDB } from '../../../lib/mongodb'
import CreditNote from '../../../models/CreditNote'
import Invoice from '../../../models/Invoice'
import { postJournalEntry } from '../../../lib/journal'
import Account from '../../../models/Account'
import { requireAuth } from '../../../lib/auth'
import { nextNumber, computeLineTotals } from '../../../lib/sequence'

export default async function handler(req, res) {
  await connectDB()
  const __auth = requireAuth(req, res); if (!__auth) return; const orgId = __auth.orgId

  if (req.method === 'GET') {
    const notes = await CreditNote.find({ orgId }).sort({ createdAt: -1 }).limit(200)
    return res.status(200).json(notes)
  }

  if (req.method === 'POST') {
    try {
      const { invoiceId, lineItems, reason, notes, date } = req.body
      if (!Array.isArray(lineItems) || lineItems.length === 0) {
        return res.status(400).json({ error: 'At least one line item is required' })
      }

      // Get customer from invoice if linked
      let customer = req.body.customer || {}
      let invoiceDoc = null
      if (invoiceId) {
        invoiceDoc = await Invoice.findOne({ _id: invoiceId, orgId })
        if (invoiceDoc) customer = invoiceDoc.customer
      }

      const totals = computeLineTotals(lineItems)

      // Atomically reduce invoice outstanding FIRST so we never create a CN whose
      // companion invoice update silently failed. If this fails, no CN is created.
      if (invoiceDoc) {
        const newPaid   = Math.min((invoiceDoc.paidAmount || 0) + totals.total, invoiceDoc.total || 0)
        const newStatus = newPaid >= (invoiceDoc.total || 0) ? 'Paid' : invoiceDoc.status
        const updated = await Invoice.findOneAndUpdate(
          { _id: invoiceId, orgId },
          { paidAmount: newPaid, status: newStatus },
          { new: true }
        )
        if (!updated) return res.status(409).json({ error: 'Could not update linked invoice' })
      }

      let cn
      try {
        cn = await CreditNote.create({
          orgId,
          creditNoteNumber: await nextNumber(orgId, 'creditnote', 'CN', 4),
          invoiceId: invoiceId || null,
          invoiceNumber: req.body.invoiceNumber || (invoiceDoc?.invoiceNumber || ''),
          customer, date: date ? new Date(date) : new Date(),
          reason, lineItems: totals.items,
          subtotal: totals.subtotal, taxTotal: totals.taxTotal, total: totals.total,
          status: 'Issued', notes,
        })
      } catch (createErr) {
        // Roll back the invoice update if CN creation failed
        if (invoiceDoc) {
          await Invoice.findOneAndUpdate(
            { _id: invoiceId, orgId },
            { paidAmount: invoiceDoc.paidAmount || 0, status: invoiceDoc.status }
          ).catch(e => console.error('[credit-notes] rollback failed:', e.message))
        }
        throw createErr
      }
      const total = totals.total

      // Post journal entry: DR Revenue (reverse), CR Accounts Receivable
      try {
        const [arAcc, revAcc] = await Promise.all([
          Account.findOne({ orgId, code: '1020' }),
          Account.findOne({ orgId, code: '4000' }),
        ])
        if (arAcc && revAcc) {
          await postJournalEntry(orgId, {
            date: cn.date,
            narration: `Credit note issued: ${cn.creditNoteNumber} — ${cn.customer?.name || ''}`,
            reference: cn.creditNoteNumber,
            sourceType: 'CreditNote',
            sourceId: cn._id,
            lines: [
              { accountId: revAcc._id, accountCode: revAcc.code, accountName: revAcc.name, debit: total,  credit: 0,     narration: 'Revenue reversal' },
              { accountId: arAcc._id,  accountCode: arAcc.code,  accountName: arAcc.name,  debit: 0,      credit: total, narration: 'AR reduction' },
            ],
          })
        }
      } catch(je) { console.error('Credit note journal error:', je.message) }

      return res.status(201).json(cn)
    } catch(e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}