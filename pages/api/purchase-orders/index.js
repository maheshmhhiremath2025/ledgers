import { connectDB } from '../../../lib/mongodb'
import PurchaseOrder from '../../../models/PurchaseOrder'
import Vendor from '../../../models/Vendor'
import { withPlan, checkLimit } from '../../../lib/plans'
import { getSession, verifyToken } from '../../../lib/session'

export default async function handler(req, res) {
  await connectDB()

  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  if (!session) return res.status(401).json({ error: 'Not authenticated' })
  const orgId = session.orgId

  if (req.method === 'GET') {
    try {
      const { status, search, page = 1, limit = 20 } = req.query
      const query = { orgId }
      if (status) query.status = status
      if (search) query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { 'vendor.name': { $regex: search, $options: 'i' } },
      ]
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const [orders, total] = await Promise.all([
        PurchaseOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        PurchaseOrder.countDocuments(query),
      ])
      return res.status(200).json({ orders, total })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const user = await withPlan(req, res)
      if (user) {
        const check = checkLimit(user, 'create_po')
        if (!check.allowed) {
          return res.status(403).json({ error: check.reason, upgrade: check.upgrade, limitReached: true })
        }
        user.poCount = (user.poCount || 0) + 1
        await user.save()
      }

      const data = req.body
      if (!data.poNumber) {
        const count = await PurchaseOrder.countDocuments({ orgId })
        data.poNumber = `PO-${String(count + 1).padStart(4, '0')}`
      }
      data.orgId = orgId
      let subtotal = 0, taxTotal = 0
      data.lineItems = (data.lineItems || []).map(item => {
        const amount = (item.qty || 0) * (item.rate || 0)
        const taxAmt = (amount * (item.tax || 0)) / 100
        subtotal += amount
        taxTotal += taxAmt
        return { ...item, amount }
      })
      data.subtotal = subtotal
      data.taxTotal = taxTotal
      data.total = subtotal + taxTotal
      const order = await PurchaseOrder.create(data)

      // Auto-create or update vendor from PO
      const vname = (data.vendor?.name || '').trim()
      if (vname) {
        try {
          const existing = await Vendor.findOne({ orgId, name: { $regex: `^${vname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
          if (!existing) {
            await Vendor.create({
              orgId,
              name:    vname,
              email:   data.vendor?.email   || '',
              phone:   data.vendor?.phone   || '',
              address: data.vendor?.address || '',
              gstin:   data.vendor?.gstin   || '',
            })
          } else {
            // Backfill any newly-supplied fields without overwriting existing values
            const updates = {}
            if (!existing.email   && data.vendor?.email)   updates.email   = data.vendor.email
            if (!existing.phone   && data.vendor?.phone)   updates.phone   = data.vendor.phone
            if (!existing.address && data.vendor?.address) updates.address = data.vendor.address
            if (!existing.gstin   && data.vendor?.gstin)   updates.gstin   = data.vendor.gstin
            if (Object.keys(updates).length) await Vendor.updateOne({ _id: existing._id }, { $set: updates })
          }
        } catch (e) { console.error('[PO] vendor auto-save failed:', e.message) }
      }

      return res.status(201).json(order)
    } catch (e) {
      return res.status(400).json({ error: e.message })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}