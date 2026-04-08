import { connectDB } from '../../../lib/mongodb'
import Bill from '../../../models/Bill'
import OrgConfig from '../../../models/OrgConfig'
import { requireAuth } from '../../../lib/auth'
import { computeWithGst } from '../../../lib/gst'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'GET') {
    const bill = await Bill.findOne({ _id: id, orgId })
    if (!bill) return res.status(404).json({ error: 'Bill not found' })
    return res.status(200).json(bill)
  }

  if (req.method === 'PUT') {
    try {
      const data = req.body
      const cfg = await OrgConfig.findOne({ orgId }).lean()
      const totals = computeWithGst(data.lineItems, { supplierGstin: cfg?.gstin, customerGstin: data.vendor?.gstin })
      data.lineItems = totals.items
      data.subtotal  = totals.subtotal
      data.taxTotal  = totals.taxTotal
      data.cgstTotal = totals.cgstTotal
      data.sgstTotal = totals.sgstTotal
      data.igstTotal = totals.igstTotal
      data.taxType   = totals.taxType
      data.total     = totals.total
      const bill = await Bill.findOneAndUpdate({ _id: id, orgId }, data, { new: true })
      if (!bill) return res.status(404).json({ error: 'Bill not found' })
      audit(req, auth, { action: 'bill.update', entityType: 'Bill', entityId: bill._id, entityRef: bill.billNumber, amount: bill.total })
      return res.status(200).json(bill)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    const bill = await Bill.findOneAndDelete({ _id: id, orgId })
    if (!bill) return res.status(404).json({ error: 'Bill not found' })
    audit(req, auth, { action: 'bill.delete', entityType: 'Bill', entityId: bill._id, entityRef: bill.billNumber, before: bill.toObject() })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
