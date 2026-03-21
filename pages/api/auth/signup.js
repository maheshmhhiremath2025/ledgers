import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { setSessionCookie, createToken } from '../../../lib/session'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const { name, email, password, orgId } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' })
  if (!orgId || !orgId.trim()) return res.status(400).json({ error: 'Organisation name is required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const cleanOrgId = orgId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!cleanOrgId) return res.status(400).json({ error: 'Invalid organisation name. Use letters, numbers and hyphens.' })
  // Block if same email already exists anywhere
  const existingEmail = await User.findOne({ email })
  if (existingEmail) return res.status(400).json({ error: 'An account with this email already exists. Please log in.' })

  // Block if orgId is already taken by anyone — orgs are private workspaces
  const existingOrg = await User.findOne({ orgId: cleanOrgId })
  if (existingOrg) return res.status(400).json({ error: 'This organisation ID is already taken. Please choose a different one.' })

  const user = new User({
    name,
    email,
    orgId: cleanOrgId,
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