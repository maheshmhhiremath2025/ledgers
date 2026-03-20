import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { getSession, verifyToken } from '../../../lib/session'
import { PLANS, getBillingPeriod, resetIfNewPeriod } from '../../../lib/plans'

export default async function handler(req, res) {
  await connectDB()

  // Triple auth
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  if (!session && req.body?.userId) session = { userId: req.body.userId }
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const user = await User.findById(session.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const orgId = user.orgId

  // Always use the ORG OWNER's plan — find the admin of this org
  // The org owner is the admin user who originally signed up (role=admin, oldest record)
  let planOwner = user
  if (user.role !== 'admin') {
    const orgAdmin = await User.findOne({ orgId, role: 'admin', status: { $ne: 'disabled' } }).sort({ createdAt: 1 })
    if (orgAdmin) planOwner = orgAdmin
  }

  if (req.method === 'GET') {
    resetIfNewPeriod(planOwner)
    const plan   = PLANS[planOwner.plan] || PLANS.starter
    const period = getBillingPeriod()

    // Usage counts — sum across org for invoices/POs
    const orgInvoiceCount = planOwner.invoiceCount || 0
    const orgPoCount      = planOwner.poCount      || 0

    return res.status(200).json({
      plan:        planOwner.plan || 'starter',
      planName:    plan.name,
      planPrice:   plan.price,
      planExpiry:  planOwner.planExpiry,
      trialEndsAt: planOwner.trialEndsAt,
      isTrialing:  planOwner.trialEndsAt && new Date() < new Date(planOwner.trialEndsAt),
      isTeamMember: user.role !== 'admin',
      myRole:      user.role,
      usage: {
        period,
        invoices: { used: orgInvoiceCount, limit: plan.invoicesPerMonth },
        pos:      { used: orgPoCount,      limit: plan.posPerMonth },
      },
      features: {
        logoUpload:     plan.logoUpload,
        savedCustomers: plan.savedCustomers,
        configuration:  plan.configuration,
        templates:      plan.templates,
        teamMembers:    plan.teamMembers,
        csvExport:      plan.csvExport,
        apiAccess:      plan.apiAccess,
        orgs:           plan.orgs,
      },
    })
  }

  // Only admin can change plan
  if (req.method === 'POST') {
    if (user.role !== 'admin') return res.status(403).json({ error: 'Only the org admin can change the plan' })

    const { newPlan } = req.body
    if (!['starter', 'professional', 'business'].includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan' })
    }
    planOwner.plan = newPlan
    if (newPlan !== 'starter') {
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + 1)
      planOwner.planExpiry = expiry
      const trial = new Date()
      trial.setDate(trial.getDate() + 14)
      planOwner.trialEndsAt = trial
    } else {
      planOwner.planExpiry  = null
      planOwner.trialEndsAt = null
    }
    await planOwner.save()
    return res.status(200).json({ message: `Plan updated to ${newPlan}`, plan: planOwner.plan })
  }

  res.status(405).end()
}