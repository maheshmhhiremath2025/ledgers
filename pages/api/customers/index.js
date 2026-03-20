import { connectDB } from '../../../lib/mongodb'
import Customer from '../../../models/Customer'
import Invoice from '../../../models/Invoice'

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
      const customers = await Customer.find(query).sort({ name: 1 }).limit(200)

      if (withStats) {
        // Attach invoice stats to each customer
        const stats = await Invoice.aggregate([
          { $match: { orgId } },
          { $group: {
            _id: '$customer.name',
            totalBilled: { $sum: '$total' },
            totalPaid:   { $sum: '$paidAmount' },
            invoiceCount: { $sum: 1 },
            lastInvoice: { $max: '$issueDate' },
            statuses: { $push: '$status' },
          }}
        ])
        const statsMap = Object.fromEntries(stats.map(s => [s._id, s]))
        const enriched = customers.map(c => {
          const s = statsMap[c.name] || {}
          return {
            ...c.toObject(),
            totalBilled:  s.totalBilled  || 0,
            totalPaid:    s.totalPaid    || 0,
            outstanding:  (s.totalBilled || 0) - (s.totalPaid || 0),
            invoiceCount: s.invoiceCount || 0,
            lastInvoice:  s.lastInvoice  || null,
            hasOverdue:   (s.statuses || []).includes('Overdue'),
          }
        })
        return res.status(200).json({ customers: enriched, total: enriched.length })
      }

      return res.status(200).json(customers)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (data.gstin) data.gstin = data.gstin.toUpperCase()
      const customer = await Customer.findOneAndUpdate(
        { orgId, name: data.name },
        data,
        { new: true, upsert: true, runValidators: true }
      )
      return res.status(200).json(customer)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}