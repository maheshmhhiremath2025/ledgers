import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import OrgConfig from '../../../models/OrgConfig'
import { getSession, verifyToken, createToken, setSessionCookie } from '../../../lib/session'

function getAuth(req) {
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  return session
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const session = getAuth(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const { targetOrgId } = req.body
  if (!targetOrgId) return res.status(400).json({ error: 'targetOrgId is required' })

  const currentUser = await User.findById(session.userId)
  if (!currentUser) return res.status(404).json({ error: 'User not found' })

  // Find the user record for the target org (same email)
  const targetUser = await User.findOne({ email: currentUser.email, orgId: targetOrgId, status: { $ne: 'disabled' } })
  if (!targetUser) return res.status(403).json({ error: 'You do not have access to this organisation' })

  // Get org admin plan
  let orgPlan = targetUser.plan || 'starter'
  if (targetUser.role !== 'admin') {
    const orgAdmin = await User.findOne({ orgId: targetOrgId, role: 'admin' }).sort({ createdAt: 1 })
    if (orgAdmin) orgPlan = orgAdmin.plan || 'starter'
  }

  const payload = {
    userId: String(targetUser._id),
    email:  targetUser.email,
    name:   targetUser.name,
    orgId:  targetUser.orgId,
    role:   targetUser.role,
    plan:   orgPlan,
  }

  setSessionCookie(res, payload)
  const token = createToken(payload)

  return res.status(200).json({ user: payload, token, message: `Switched to ${targetOrgId}` })
}