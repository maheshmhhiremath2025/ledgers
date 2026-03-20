import { connectDB } from '../../../lib/mongodb'
import OrgConfig from '../../../models/OrgConfig'
import { withPlan, checkLimit } from '../../../lib/plans'

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    try {
      let cfg = await OrgConfig.findOne({ orgId })
      const user = await withPlan(req, res)
      if (!cfg) {
        cfg = { orgId, businessName:'', businessEmail:'', businessPhone:'', businessAddress:'',
          businessWebsite:'', logoUrl:'', gstin:'', pan:'', sacCode:'', bankName:'', accountName:'',
          accountNumber:'', ifscCode:'', bankBranch:'', upiId:'', paymentInstructions:'',
          invoicePrefix:'INV', poPrefix:'PO', defaultCurrency:'INR', defaultTax:18,
          defaultTerms:'Payment due within 30 days.', defaultNotes:'Thank you for your business!',
          signatureName:'', signatureTitle:'', signatureImage:'',
          footerText:'This is a computer-generated invoice.',
          smtpHost:'', smtpPort:587, smtpUser:'', smtpPass:'', smtpFrom:'', smtpSecure:false,
          emailSubject:'Invoice {{invoiceNumber}} from {{businessName}}',
          emailBody:'Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}.\n\n{{notes}}\n\nThank you for your business!\n\n{{businessName}}',
          _plan: user?.plan || 'starter' }
        return res.status(200).json(cfg)
      }
      const obj = cfg.toObject()
      return res.status(200).json({ ...obj, signatureImage: obj.signatureImage || '', _plan: user?.plan || 'starter' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const body = req.body || {}
      const isSignatureOnly = Object.keys(body).length === 1 && 'signatureImage' in body

      // For signature-only saves, skip all plan checks and save directly
      if (isSignatureOnly) {
        const result = await OrgConfig.findOneAndUpdate(
          { orgId },
          { $set: { signatureImage: body.signatureImage } },
          { upsert: true, new: true }
        )
        const saved = result.toObject()
        console.log('[config] signature saved, len:', saved.signatureImage?.length || 0)
        return res.status(200).json({ success: true, signatureImage: saved.signatureImage })
      }

      // Full config save — check plan
      const user = await withPlan(req, res)
      const configCheck = checkLimit(user || { plan: 'starter' }, 'configuration')
      if (!configCheck.allowed) {
        return res.status(403).json({ error: configCheck.reason, upgrade: configCheck.upgrade, limitReached: true })
      }

      let data = { ...body, orgId }

      // Protect logo
      const logoCheck = checkLimit(user || { plan: 'starter' }, 'logo_upload')
      if (!logoCheck.allowed) {
        const existing = await OrgConfig.findOne({ orgId })
        if (existing?.logoUrl) data.logoUrl = existing.logoUrl
        else delete data.logoUrl
      }

      // Never wipe signature
      if (!data.signatureImage) {
        const existing = await OrgConfig.findOne({ orgId })
        if (existing?.signatureImage) data.signatureImage = existing.signatureImage
      }

      const config = await OrgConfig.findOneAndUpdate(
        { orgId }, data, { new: true, upsert: true, runValidators: false }
      )
      const cfgObj = config.toObject()
      console.log('[config] full save, signatureImage len:', cfgObj.signatureImage?.length || 0)
      return res.status(200).json(cfgObj)
    } catch (e) {
      console.error('[config POST error]', e.message)
      return res.status(400).json({ error: e.message })
    }
  }

  res.status(405).end()
}