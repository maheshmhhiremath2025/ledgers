import { connectDB } from '../../../lib/mongodb'
import Vendor from '../../../models/Vendor'
import PurchaseOrder from '../../../models/PurchaseOrder'

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    try {
      const { search, withStats } = req.query
      const query = { orgId }
      if (search) query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
      const vendors = await Vendor.find(query).sort({ name: 1 }).limit(200)

      if (withStats) {
        const stats = await PurchaseOrder.aggregate([
          { $match: { orgId } },
          { $group: {
            _id: '$vendor.name',
            totalSpend: { $sum: '$total' },
            poCount:    { $sum: 1 },
            lastPO:     { $max: '$issueDate' },
            statuses:   { $push: '$status' },
          }}
        ])
        const statsMap = Object.fromEntries(stats.map(s => [s._id, s]))
        const enriched = vendors.map(v => {
          const s = statsMap[v.name] || {}
          return {
            ...v.toObject(),
            totalSpend: s.totalSpend || 0,
            poCount:    s.poCount    || 0,
            lastPO:     s.lastPO     || null,
            hasPending: (s.statuses || []).some(st => ['Draft','Sent'].includes(st)),
          }
        })
        return res.status(200).json({ vendors: enriched, total: enriched.length })
      }
      return res.status(200).json(vendors)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (data.gstin) data.gstin = data.gstin.toUpperCase()
      const vendor = await Vendor.findOneAndUpdate(
        { orgId, name: data.name },
        data,
        { new: true, upsert: true, runValidators: true }
      )
      return res.status(200).json(vendor)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}