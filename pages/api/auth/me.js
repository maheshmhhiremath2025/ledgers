import { clearSessionCookie, getSession, verifyToken } from '../../../lib/session'
import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    clearSessionCookie(res)
    return res.status(200).json({ message: 'Logged out' })
  }

  if (req.method === 'GET') {
    let session = null

    // 1. Try cookie
    session = getSession(req)

    // 2. Try Authorization: Bearer <token> header
    if (!session) {
      const auth = req.headers['authorization'] || ''
      if (auth.startsWith('Bearer ')) {
        session = verifyToken(auth.slice(7))
      }
    }

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      await connectDB()
      const user = await User.findById(session.userId).select('-passwordHash')
      if (!user) return res.status(401).json({ error: 'User not found' })
      // Get org plan from owner (admin)
      let orgPlan = user.plan || 'starter'
      if (user.role !== 'admin') {
        const orgAdmin = await User.findOne({ orgId: user.orgId, role: 'admin', status: { $ne: 'disabled' } }).sort({ createdAt: 1 })
        if (orgAdmin) orgPlan = orgAdmin.plan || 'starter'
      }

      return res.status(200).json({
        user: {
          userId: String(user._id),
          email:  user.email,
          name:   user.name,
          orgId:  user.orgId,
          role:   user.role,
          plan:   orgPlan,
        }
      })
    } catch (e) {
      return res.status(200).json({ user: session })
    }
  }

  res.status(405).end()
}