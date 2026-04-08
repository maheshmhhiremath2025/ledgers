import { connectDB } from '../../../lib/mongodb'
import Bill from '../../../models/Bill'
import Vendor from '../../../models/Vendor'
import { requireAuth } from '../../../lib/auth'
import { nextNumber } from '../../../lib/sequence'
import { computeWithGst } from '../../../lib/gst'
import OrgConfig from '../../../models/OrgConfig'
import { audit } from '../../../lib/audit'
import { postBillRecorded } from '../../../lib/journal'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    try {
      const { status, search, page = 1, limit = 20 } = req.query
      const query = { orgId }
      if (status) query.status = status
      if (search) query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { vendorBillNumber: { $regex: search, $options: 'i' } },
        { 'vendor.name': { $regex: search, $options: 'i' } },
      ]
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const [bills, total] = await Promise.all([
        Bill.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        Bill.countDocuments(query),
      ])
      return res.status(200).json({ bills, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body
      if (!data.billNumber) data.billNumber = await nextNumber(orgId, 'bill', 'BILL', 4)
      data.orgId = orgId

      const cfg = await OrgConfig.findOne({ orgId }).lean()
      const totals = computeWithGst(data.lineItems, {
        supplierGstin: cfg?.gstin,
        customerGstin: data.vendor?.gstin,
      })
      data.lineItems = totals.items
      data.subtotal  = totals.subtotal
      data.taxTotal  = totals.taxTotal
      data.cgstTotal = totals.cgstTotal
      data.sgstTotal = totals.sgstTotal
      data.igstTotal = totals.igstTotal
      data.taxType   = totals.taxType
      data.total     = totals.total

      const bill = await Bill.create(data)

      audit(req, auth, {
        action: 'bill.create', entityType: 'Bill',
        entityId: bill._id, entityRef: bill.billNumber,
        amount: bill.total, after: bill.toObject(),
      })

      // Auto-post journal entry (Expense / AP)
      postBillRecorded(orgId, bill).catch(e => console.error('[bills] journal error:', e.message))

      // Auto-create vendor
      const vname = (data.vendor?.name || '').trim()
      if (vname) {
        try {
          const existing = await Vendor.findOne({ orgId, name: { $regex: `^${vname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
          if (!existing) {
            await Vendor.create({
              orgId, name: vname,
              email:   data.vendor?.email   || '',
              phone:   data.vendor?.phone   || '',
              address: data.vendor?.address || '',
              gstin:   data.vendor?.gstin   || '',
            })
          }
        } catch (e) { console.error('[bills] vendor auto-save failed:', e.message) }
      }

      return res.status(201).json(bill)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
