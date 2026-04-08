import { connectDB } from '../../../lib/mongodb'
import Project from '../../../models/Project'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'PUT') {
    const p = await Project.findOneAndUpdate({ _id: id, orgId }, req.body, { new: true })
    if (!p) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(p)
  }
  if (req.method === 'DELETE') {
    const p = await Project.findOneAndDelete({ _id: id, orgId })
    if (!p) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
