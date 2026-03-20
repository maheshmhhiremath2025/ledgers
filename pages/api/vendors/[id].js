import { connectDB } from '../../../lib/mongodb'
import Vendor from '../../../models/Vendor'
import PurchaseOrder from '../../../models/PurchaseOrder'

export default async function handler(req, res) {
  await connectDB()
  const { id } = req.query
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    const vendor = await Vendor.findOne({ _id: id, orgId })
    if (!vendor) return res.status(404).json({ error: 'Not found' })
    const pos = await PurchaseOrder.find({ orgId, 'vendor.name': vendor.name }).sort({ issueDate: -1 })
    const totalSpend   = pos.reduce((s, p) => s + (p.total || 0), 0)
    const totalPending = pos.filter(p => ['Draft','Sent'].includes(p.status)).reduce((s, p) => s + (p.total || 0), 0)
    return res.status(200).json({ vendor, pos, totalSpend, totalPending })
  }

  if (req.method === 'PUT') {
    try {
      const data = req.body
      if (data.gstin) data.gstin = data.gstin.toUpperCase()
      const vendor = await Vendor.findOneAndUpdate({ _id: id, orgId }, data, { new: true })
      if (!vendor) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(vendor)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    await Vendor.findOneAndDelete({ _id: id, orgId })
    return res.status(200).json({ message: 'Deleted' })
  }
  res.status(405).end()
}