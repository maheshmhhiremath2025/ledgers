import { connectDB } from '../../../lib/mongodb'
import BankAccount from '../../../models/BankAccount'
import { requireAuth } from '../../../lib/auth'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    const accounts = await BankAccount.find({ orgId }).sort({ active: -1, createdAt: 1 })
    return res.status(200).json(accounts)
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (data.openingBalance != null && data.currentBalance == null) {
        data.currentBalance = data.openingBalance
      }
      const acc = await BankAccount.create(data)
      audit(req, auth, { action: 'bank.create', entityType: 'BankAccount', entityId: acc._id, entityRef: acc.name, amount: acc.openingBalance })
      return res.status(201).json(acc)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}
