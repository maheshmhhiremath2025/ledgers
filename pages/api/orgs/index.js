import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import OrgConfig from '../../../models/OrgConfig'
import { getSession, verifyToken } from '../../../lib/session'

function getAuth(req) {
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  return session
}

const MAX_ORGS = 3 // Business plan max
const ORG_LIMITS = { starter: 1, professional: 2, business: 3 }

export default async function handler(req, res) {
  await connectDB()
  const session = getAuth(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const currentUser = await User.findById(session.userId)
  if (!currentUser) return res.status(404).json({ error: 'User not found' })

  // GET — list all orgs this email belongs to
  if (req.method === 'GET') {
    const allUsers = await User.find({ email: currentUser.email, status: { $ne: 'disabled' } })
    const orgs = await Promise.all(allUsers.map(async u => {
      const cfg = await OrgConfig.findOne({ orgId: u.orgId })
      return {
        userId:       String(u._id),
        orgId:        u.orgId,
        role:         u.role,
        plan:         u.plan,
        businessName: cfg?.businessName || u.orgId,
        logoUrl:      cfg?.logoUrl || '',
        isCurrent:    String(u._id) === session.userId,
      }
    }))
    return res.status(200).json({ orgs, maxOrgs: MAX_ORGS })
  }

  // POST — create a new org
  if (req.method === 'POST') {
    // ── Plan check: Business only ──
    if (currentUser.plan !== 'business') {
      return res.status(403).json({
        error: 'Multiple organisations require the Business plan (₹2,499/month)',
        upgrade: true,
        requiredPlan: 'business',
      })
    }

    // ── Org limit: plan-based ──
    const existingOrgs = await User.find({ email: currentUser.email, status: { $ne: 'disabled' } })
    const planLimit = ORG_LIMITS[currentUser.plan] || 1
    if (existingOrgs.length >= planLimit) {
      return res.status(403).json({
        error: `Your ${currentUser.plan} plan allows up to ${planLimit} organisation${planLimit > 1 ? 's' : ''}. You have reached the limit.`,
        limitReached: true,
      })
    }

    const { orgId, businessName } = req.body
    if (!orgId) return res.status(400).json({ error: 'Organisation ID is required' })

    const cleanOrgId = orgId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!cleanOrgId) return res.status(400).json({ error: 'Invalid organisation ID' })

    const existing = await User.findOne({ orgId: cleanOrgId })
    if (existing) return res.status(400).json({ error: 'This organisation ID is already taken. Try a different one.' })

    // Create new user record for this org (same email, new orgId)
    const newUser = new User({
      name:    currentUser.name,
      email:   currentUser.email,
      orgId:   cleanOrgId,
      role:    'admin',
      plan:    'business', // inherits business plan
      status:  'active',
      active:  true,
    })
    newUser.setPassword(String(currentUser._id)) // placeholder password
    await newUser.save()

    if (businessName) {
      await OrgConfig.findOneAndUpdate(
        { orgId: cleanOrgId },
        { orgId: cleanOrgId, businessName },
        { upsert: true, new: true }
      )
    }

    return res.status(201).json({
      message: `Organisation "${cleanOrgId}" created`,
      orgId: cleanOrgId,
      userId: String(newUser._id),
    })
  }

  res.status(405).end()
}