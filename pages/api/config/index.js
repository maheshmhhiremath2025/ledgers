import { connectDB } from '../../../lib/mongodb'
import OrgConfig from '../../../models/OrgConfig'
import { withPlan, checkLimit } from '../../../lib/plans'

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    try {
      let config = await OrgConfig.findOne({ orgId })
      if (!config) {
        config = { orgId, businessName:'', businessEmail:'', businessPhone:'', businessAddress:'', businessWebsite:'', logoUrl:'', gstin:'', pan:'', sacCode:'', bankName:'', accountName:'', accountNumber:'', ifscCode:'', bankBranch:'', upiId:'', paymentInstructions:'', invoicePrefix:'INV', poPrefix:'PO', defaultCurrency:'INR', defaultTax:18, defaultTerms:'Payment due within 30 days.', defaultNotes:'Thank you for your business!', signatureName:'', signatureTitle:'', footerText:'This is a computer-generated invoice.' }
      }
      // Attach plan info so frontend can show gates
      const user = await withPlan(req, res)
      return res.status(200).json({ ...config.toObject?.() || config, _plan: user?.plan || 'starter' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const user = await withPlan(req, res)
      const plan = user?.plan || 'starter'

      // Check config permission
      const configCheck = checkLimit(user || { plan: 'starter' }, 'configuration')
      if (!configCheck.allowed) {
        return res.status(403).json({ error: configCheck.reason, upgrade: configCheck.upgrade, limitReached: true })
      }

      let data = { ...req.body, orgId }

      // Only strip NEW logo uploads if plan doesn't allow — never wipe existing logo
      const logoCheck = checkLimit(user || { plan: 'starter' }, 'logo_upload')
      if (!logoCheck.allowed) {
        const existing = await OrgConfig.findOne({ orgId })
        if (existing?.logoUrl) data.logoUrl = existing.logoUrl
        else delete data.logoUrl
      }

      const config = await OrgConfig.findOneAndUpdate({ orgId }, data, { new: true, upsert: true, runValidators: true })
      return res.status(200).json(config)
    } catch (e) {
      return res.status(400).json({ error: e.message })
    }
  }

  res.status(405).end()
}