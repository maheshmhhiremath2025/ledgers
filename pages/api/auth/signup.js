import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { setSessionCookie, createToken } from '../../../lib/session'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const { name, email, password, orgId } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const existing = await User.findOne({ email })
  if (existing) return res.status(400).json({ error: 'Email already registered' })

  const user = new User({
    name,
    email,
    orgId: orgId || email.split('@')[1].replace(/\./g, '-'),
    role: 'admin',
    plan: 'starter',
  })
  user.setPassword(password)
  await user.save()

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

  return res.status(201).json({
    user: payload,
    token,
  })
}