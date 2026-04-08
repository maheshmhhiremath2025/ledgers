import { connectDB } from '../../../lib/mongodb'
import Project from '../../../models/Project'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    const items = await Project.find({ orgId }).sort({ createdAt: -1 })
    return res.status(200).json(items)
  }
  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (!data.name) return res.status(400).json({ error: 'name required' })
      const p = await Project.create(data)
      return res.status(201).json(p)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}
