import { connectDB } from '../../lib/mongodb'
import AuditLog from '../../models/AuditLog'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  if (req.method !== 'GET') return res.status(405).end()

  const orgId = auth.orgId
  const { page = 1, limit = 50, action, entityType, search, from, to } = req.query

  const query = { orgId }
  if (action)     query.action     = action
  if (entityType) query.entityType = entityType
  if (search) {
    query.$or = [
      { entityRef: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } },
      { userName:  { $regex: search, $options: 'i' } },
    ]
  }
  if (from || to) {
    query.createdAt = {}
    if (from) query.createdAt.$gte = new Date(from)
    if (to)   query.createdAt.$lte = new Date(to)
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [logs, total, distinctActions] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    AuditLog.countDocuments(query),
    AuditLog.distinct('action', { orgId }),
  ])

  return res.status(200).json({
    logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)),
    actions: distinctActions.sort(),
  })
}
