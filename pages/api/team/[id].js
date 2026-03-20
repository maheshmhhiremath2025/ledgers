import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { getSession, verifyToken } from '../../../lib/session'

function getAuth(req) {
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  return session
}

export default async function handler(req, res) {
  await connectDB()
  const session = getAuth(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const { id } = req.query
  const orgId = req.headers['x-org-id'] || session.orgId || 'default'

  const me = await User.findById(session.userId)
  if (me?.role !== 'admin') return res.status(403).json({ error: 'Only admins can manage members' })

  const target = await User.findOne({ _id: id, orgId })
  if (!target) return res.status(404).json({ error: 'Member not found' })

  // Can't modify yourself
  if (String(target._id) === session.userId) return res.status(400).json({ error: "You can't modify your own account here" })

  if (req.method === 'PUT') {
    const { role, status } = req.body
    if (role && ['admin','accountant','viewer'].includes(role)) target.role = role
    if (status && ['active','disabled'].includes(status)) {
      target.status = status
      target.active = status === 'active'
    }
    await target.save()
    return res.status(200).json({ message: 'Updated', member: { _id: target._id, name: target.name, email: target.email, role: target.role, status: target.status } })
  }

  if (req.method === 'DELETE') {
    await User.findByIdAndDelete(id)
    return res.status(200).json({ message: 'Removed from team' })
  }

  res.status(405).end()
}