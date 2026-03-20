import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { setSessionCookie, createToken } from '../../../lib/session'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  // Find the primary org record (admin role, earliest created) for this email
  const allUsers = await User.find({ email: email.toLowerCase() }).sort({ createdAt: 1 })
  if (!allUsers.length) return res.status(401).json({ error: 'Invalid email or password' })

  // Try to verify password against any of the user's org records
  const user = allUsers.find(u => u.verifyPassword(password)) || null
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })
  if (!user.active) return res.status(403).json({ error: 'Account disabled' })

  const payload = {
    userId: String(user._id),
    email:  user.email,
    name:   user.name,
    orgId:  user.orgId,
    role:   user.role,
    plan:   user.plan || 'starter',
  }

  setSessionCookie(res, payload)
  const token = createToken(payload)

  return res.status(200).json({
    user: payload,
    token, // return token so client can store in localStorage as backup
  })
}