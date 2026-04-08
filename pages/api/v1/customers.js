import { connectDB } from '../../../lib/mongodb'
import Customer from '../../../models/Customer'
import { requireApiKey } from '../../../lib/apikey'
import { fireWebhook } from '../../../lib/webhooks'

export default async function handler(req, res) {
  await connectDB()
  const ctx = await requireApiKey(req, res, { writeRequired: req.method === 'POST' })
  if (!ctx) return
  const { orgId } = ctx

  if (req.method === 'GET') {
    const { page = 1, limit = 50, search } = req.query
    const q = { orgId }
    if (search) q.name = { $regex: search, $options: 'i' }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [data, total] = await Promise.all([
      Customer.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Customer.countDocuments(q),
    ])
    return res.status(200).json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (!data.name) return res.status(400).json({ error: 'name required' })
      const c = await Customer.create(data)
      fireWebhook(orgId, 'customer.created', { customer: c }).catch(() => {})
      return res.status(201).json(c)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}
