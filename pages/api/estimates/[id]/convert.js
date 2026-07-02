import { connectDB } from '../../../../lib/mongodb'
import Estimate from '../../../../models/Estimate'
import Invoice from '../../../../models/Invoice'
import { requireAuth } from '../../../../lib/auth'
import { nextNumber } from '../../../../lib/sequence'
import { audit } from '../../../../lib/audit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  const est = await Estimate.findOne({ _id: id, orgId })
  if (!est) return res.status(404).json({ error: 'Quotation not found' })
  if (est.convertedInvoiceId) return res.status(400).json({ error: 'Quotation already converted to invoice ' + est.convertedInvoiceNumber })

  const invoiceNumber = await nextNumber(orgId, 'invoice', 'INV', 4)

  const inv = await Invoice.create({
    orgId,
    invoiceNumber,
    status: 'Draft',
    customer: est.customer,
    issueDate: new Date(),
    dueDate: req.body?.dueDate || null,
    lineItems: est.lineItems,
    subtotal: est.subtotal,
    taxTotal: est.taxTotal,
    total: est.total,
    currency: est.currency,
    notes: est.notes,
    terms: est.terms,
    estimateId: est._id,
    template: 'classic',
  })

  est.status = 'Invoiced'
  est.convertedInvoiceId     = inv._id
  est.convertedInvoiceNumber = inv.invoiceNumber
  est.convertedAt            = new Date()
  await est.save()

  audit(req, auth, {
    action: 'quotation.convert', entityType: 'Quotation',
    entityId: est._id, entityRef: est.estimateNumber, amount: est.total,
    meta: { invoiceId: inv._id, invoiceNumber: inv.invoiceNumber },
  })

  return res.status(201).json({ invoice: inv, estimate: est })
}
