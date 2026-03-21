// Plan definitions
export const PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    invoicesPerMonth: 5,
    posPerMonth: 3,
    orgs: 1,
    templates: ['classic'],
    logoUpload: false,
    savedCustomers: false,
    configuration: false,
    teamMembers: 0,
    csvExport: false,
    apiAccess: false,
  },
  professional: {
    name: 'Professional',
    price: 999,
    invoicesPerMonth: Infinity,
    posPerMonth: Infinity,
    orgs: 1,
    templates: ['classic', 'minimal', 'modern', 'bold', 'professional'],
    logoUpload: true,
    savedCustomers: true,
    configuration: true,
    teamMembers: 0,
    csvExport: false,
    apiAccess: false,
  },
  business: {
    name: 'Business',
    price: 2499,
    invoicesPerMonth: Infinity,
    posPerMonth: Infinity,
    orgs: 2,
    templates: ['classic', 'minimal', 'modern', 'bold', 'professional'],
    logoUpload: true,
    savedCustomers: true,
    configuration: true,
    teamMembers: 5,
    csvExport: true,
    apiAccess: true,
  },
}

// Get current billing period key e.g. "2026-03"
export function getBillingPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Reset counters if new billing period
export function resetIfNewPeriod(user) {
  const period = getBillingPeriod()
  if (user.usagePeriod !== period) {
    user.usagePeriod = period
    user.invoiceCount = 0
    user.poCount = 0
  }
}

// Check if user can perform an action — returns { allowed, reason, limit, used }
export function checkLimit(user, action) {
  const plan = PLANS[user.plan] || PLANS.starter
  resetIfNewPeriod(user)

  switch (action) {
    case 'create_invoice':
      if (plan.invoicesPerMonth === Infinity) return { allowed: true }
      if (user.invoiceCount >= plan.invoicesPerMonth) {
        return {
          allowed: false,
          reason: `You've used ${user.invoiceCount}/${plan.invoicesPerMonth} invoices this month.`,
          upgrade: 'Upgrade to Professional for unlimited invoices.',
          limit: plan.invoicesPerMonth,
          used: user.invoiceCount,
        }
      }
      return { allowed: true, limit: plan.invoicesPerMonth, used: user.invoiceCount }

    case 'create_po':
      if (plan.posPerMonth === Infinity) return { allowed: true }
      if (user.poCount >= plan.posPerMonth) {
        return {
          allowed: false,
          reason: `You've used ${user.poCount}/${plan.posPerMonth} purchase orders this month.`,
          upgrade: 'Upgrade to Professional for unlimited POs.',
          limit: plan.posPerMonth,
          used: user.poCount,
        }
      }
      return { allowed: true, limit: plan.posPerMonth, used: user.poCount }

    case 'logo_upload':
      return { allowed: plan.logoUpload, reason: 'Logo upload requires Professional plan.', upgrade: 'Upgrade to upload your company logo.' }

    case 'configuration':
      return { allowed: plan.configuration, reason: 'GST & bank configuration requires Professional plan.', upgrade: 'Upgrade to add your GST, bank details and more.' }

    case 'saved_customers':
      return { allowed: plan.savedCustomers, reason: 'Saved customers requires Professional plan.', upgrade: 'Upgrade to save and reuse customer details.' }

    case 'pdf_template':
      return { allowed: true } // template check done separately

    case 'csv_export':
      return { allowed: plan.csvExport, reason: 'CSV export requires Business plan.', upgrade: 'Upgrade to Business for CSV and Excel export.' }

    default:
      return { allowed: true }
  }
}

export function canUseTemplate(user, templateId) {
  const plan = PLANS[user.plan] || PLANS.starter
  if (plan.templates.includes(templateId)) return { allowed: true }
  return {
    allowed: false,
    reason: `The "${templateId}" template requires Professional plan.`,
    upgrade: 'Upgrade to unlock all 5 invoice templates.',
  }
}

// Middleware: attach user + plan to request
import { connectDB } from './mongodb'
import User from '../models/User'
import { getSession, verifyToken } from './session'

export async function withPlan(req, res) {
  // Auth: cookie → Bearer header
  let session = getSession(req)
  if (!session) {
    const auth = (req.headers && req.headers['authorization']) || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  if (!session) return null
  await connectDB()
  const user = await User.findById(session.userId)
  if (!user) return null

  // Always use org owner's plan for limit checks
  if (user.role !== 'admin') {
    const orgAdmin = await User.findOne({ orgId: user.orgId, role: 'admin', status: { $ne: 'disabled' } }).sort({ createdAt: 1 })
    if (orgAdmin) {
      resetIfNewPeriod(orgAdmin)
      return orgAdmin
    }
  }

  resetIfNewPeriod(user)
  return user
}