import { connectDB } from '../../../lib/mongodb'
import Product from '../../../models/Product'
import { requireApiKey } from '../../../lib/apikey'

export default async function handler(req, res) {
  await connectDB()
  const ctx = await requireApiKey(req, res, { writeRequired: req.method === 'POST' })
  if (!ctx) return
  const { orgId } = ctx

  if (req.method === 'GET') {
    const data = await Product.find({ orgId }).sort({ name: 1 }).lean()
    return res.status(200).json({ data, total: data.length })
  }
  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (!data.name) return res.status(400).json({ error: 'name required' })
      const p = await Product.create(data)
      return res.status(201).json(p)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}
