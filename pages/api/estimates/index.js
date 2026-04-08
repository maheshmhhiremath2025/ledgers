import { connectDB } from '../../../lib/mongodb'
import Estimate from '../../../models/Estimate'
import Customer from '../../../models/Customer'
import OrgConfig from '../../../models/OrgConfig'
import { requireAuth } from '../../../lib/auth'
import { nextNumber } from '../../../lib/sequence'
import { computeWithGst } from '../../../lib/gst'
import { audit } from '../../../lib/audit'

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
        { estimateNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
      ]
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const [estimates, total] = await Promise.all([
        Estimate.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        Estimate.countDocuments(query),
      ])
      return res.status(200).json({ estimates, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body
      if (!data.estimateNumber) {
        data.estimateNumber = await nextNumber(orgId, 'estimate', 'EST', 4)
      }
      data.orgId = orgId
      const cfg = await OrgConfig.findOne({ orgId }).lean()
      const totals = computeWithGst(data.lineItems, {
        supplierGstin: cfg?.gstin,
        customerGstin: data.customer?.gstin,
      })
      data.lineItems = totals.items
      data.subtotal  = totals.subtotal
      data.taxTotal  = totals.taxTotal
      data.cgstTotal = totals.cgstTotal
      data.sgstTotal = totals.sgstTotal
      data.igstTotal = totals.igstTotal
      data.taxType   = totals.taxType
      data.total     = totals.total

      const est = await Estimate.create(data)

      audit(req, auth, {
        action: 'estimate.create', entityType: 'Estimate',
        entityId: est._id, entityRef: est.estimateNumber,
        amount: est.total, after: est.toObject(),
      })

      // Auto-create customer for parity with invoices/POs
      const cname = (data.customer?.name || '').trim()
      if (cname) {
        try {
          const existing = await Customer.findOne({ orgId, name: { $regex: `^${cname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
          if (!existing) {
            await Customer.create({
              orgId, name: cname,
              email:   data.customer?.email   || '',
              phone:   data.customer?.phone   || '',
              address: data.customer?.address || '',
              gstin:   data.customer?.gstin   || '',
            })
          }
        } catch (e) { console.error('[estimates] customer auto-save failed:', e.message) }
      }

      return res.status(201).json(est)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
