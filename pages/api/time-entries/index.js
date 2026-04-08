import { connectDB } from '../../../lib/mongodb'
import TimeEntry from '../../../models/TimeEntry'
import Project from '../../../models/Project'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    const { projectId, billable, from, to } = req.query
    const q = { orgId }
    if (projectId) q.projectId = projectId
    if (billable === 'true')  q.billable = true
    if (billable === 'false') q.billable = false
    if (from || to) {
      q.date = {}
      if (from) q.date.$gte = new Date(from)
      if (to)   q.date.$lte = new Date(to)
    }
    const items = await TimeEntry.find(q).sort({ date: -1 }).limit(500)
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    try {
      const { projectId, hours, date } = req.body || {}
      if (!projectId || !hours || !date) return res.status(400).json({ error: 'projectId, hours and date required' })
      const project = await Project.findOne({ _id: projectId, orgId })
      if (!project) return res.status(404).json({ error: 'Project not found' })
      const entry = await TimeEntry.create({
        ...req.body,
        orgId,
        projectName: project.name,
        userId: auth.userId,
        userName: auth.name,
        hourlyRate: req.body.hourlyRate ?? project.hourlyRate ?? 0,
        date: new Date(date),
      })
      return res.status(201).json(entry)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}
