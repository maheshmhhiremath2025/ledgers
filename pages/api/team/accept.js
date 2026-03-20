import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { setSessionCookie, createToken } from '../../../lib/session'

export default async function handler(req, res) {
  await connectDB()

  if (req.method === 'GET') {
    const { token } = req.query
    const user = await User.findOne({ inviteToken: token, inviteExpiry: { $gt: new Date() } })
    if (!user) return res.status(404).json({ error: 'Invite link is invalid or expired' })
    return res.status(200).json({ name: user.name, email: user.email, role: user.role, orgId: user.orgId })
  }

  if (req.method === 'POST') {
    const { token, name, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const user = await User.findOne({ inviteToken: token, inviteExpiry: { $gt: new Date() } })
    if (!user) return res.status(404).json({ error: 'Invite link is invalid or expired' })

    if (name) user.name = name
    user.setPassword(password)
    user.inviteToken  = null
    user.inviteExpiry = null
    user.status = 'active'
    user.active = true
    await user.save()

    const payload = { userId: String(user._id), email: user.email, name: user.name, orgId: user.orgId, role: user.role, plan: user.plan || 'starter' }
    setSessionCookie(res, payload)
    const authToken = createToken(payload)

    return res.status(200).json({ user: payload, token: authToken, message: 'Welcome! Account activated.' })
  }

  res.status(405).end()
}