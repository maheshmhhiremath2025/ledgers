import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import Invoice from '../../../models/Invoice'
import Customer from '../../../models/Customer'
import OrgConfig from '../../../models/OrgConfig'

// Safe models to migrate
const MODELS = [
  { name: 'Invoice', model: () => Invoice },
  { name: 'Customer', model: () => Customer },
  { name: 'OrgConfig', model: () => OrgConfig },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  
  const { adminSecret, fromOrgId, toOrgId } = req.body
  
  // Simple protection
  if (adminSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  if (!fromOrgId || !toOrgId) {
    return res.status(400).json({ error: 'fromOrgId and toOrgId required' })
  }

  await connectDB()
  
  // Dynamically import all models
  const [
    Payment, Expense, PurchaseOrder, Vendor, Product,
    Account, JournalEntry, CreditNote, RecurringInvoice
  ] = await Promise.all([
    import('../../../models/Payment').then(m => m.default),
    import('../../../models/Expense').then(m => m.default),
    import('../../../models/PurchaseOrder').then(m => m.default),
    import('../../../models/Vendor').then(m => m.default).catch(() => null),
    import('../../../models/Product').then(m => m.default).catch(() => null),
    import('../../../models/Account').then(m => m.default),
    import('../../../models/JournalEntry').then(m => m.default).catch(() => null),
    import('../../../models/CreditNote').then(m => m.default).catch(() => null),
    import('../../../models/RecurringInvoice').then(m => m.default).catch(() => null),
  ])

  const allModels = [
    { name: 'Invoice', model: Invoice },
    { name: 'Customer', model: Customer },
    { name: 'OrgConfig', model: OrgConfig },
    { name: 'Payment', model: Payment },
    { name: 'Expense', model: Expense },
    { name: 'PurchaseOrder', model: PurchaseOrder },
    { name: 'Vendor', model: Vendor },
    { name: 'Product', model: Product },
    { name: 'Account', model: Account },
    { name: 'JournalEntry', model: JournalEntry },
    { name: 'CreditNote', model: CreditNote },
    { name: 'RecurringInvoice', model: RecurringInvoice },
  ].filter(m => m.model)

  const results = {}
  
  for (const { name, model } of allModels) {
    try {
      const count = await model.countDocuments({ orgId: fromOrgId })
      if (count > 0) {
        const r = await model.updateMany({ orgId: fromOrgId }, { $set: { orgId: toOrgId } })
        results[name] = { found: count, updated: r.modifiedCount }
      } else {
        results[name] = { found: 0, updated: 0 }
      }
    } catch(e) {
      results[name] = { error: e.message }
    }
  }

  return res.status(200).json({ 
    message: `Migration from "${fromOrgId}" to "${toOrgId}" complete`,
    results 
  })
}