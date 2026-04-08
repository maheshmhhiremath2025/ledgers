import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import OrgConfig from '../../../models/OrgConfig'
import { requireApiKey } from '../../../lib/apikey'
import { nextNumber } from '../../../lib/sequence'
import { computeWithGst } from '../../../lib/gst'
import { fireWebhook } from '../../../lib/webhooks'

export default async function handler(req, res) {
  await connectDB()
  const ctx = await requireApiKey(req, res, { writeRequired: req.method === 'POST' })
  if (!ctx) return
  const { orgId } = ctx

  if (req.method === 'GET') {
    const { page = 1, limit = 50, status } = req.query
    const q = { orgId }
    if (status) q.status = status
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [data, total] = await Promise.all([
      Invoice.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Invoice.countDocuments(q),
    ])
    return res.status(200).json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (!data.customer?.name) return res.status(400).json({ error: 'customer.name required' })
      if (!Array.isArray(data.lineItems) || data.lineItems.length === 0) {
        return res.status(400).json({ error: 'lineItems required' })
      }
      data.invoiceNumber = data.invoiceNumber || await nextNumber(orgId, 'invoice', 'INV', 4)
      const cfg = await OrgConfig.findOne({ orgId }).lean()
      const totals = computeWithGst(data.lineItems, { supplierGstin: cfg?.gstin, customerGstin: data.customer?.gstin })
      Object.assign(data, {
        lineItems: totals.items, subtotal: totals.subtotal, taxTotal: totals.taxTotal,
        cgstTotal: totals.cgstTotal, sgstTotal: totals.sgstTotal, igstTotal: totals.igstTotal,
        taxType: totals.taxType, total: totals.total,
      })
      const invoice = await Invoice.create(data)
      fireWebhook(orgId, 'invoice.created', { invoice }).catch(() => {})
      return res.status(201).json(invoice)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}
