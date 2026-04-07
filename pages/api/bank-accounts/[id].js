import { connectDB } from '../../../lib/mongodb'
import BankAccount from '../../../models/BankAccount'
import { requireAuth } from '../../../lib/auth'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'GET') {
    const acc = await BankAccount.findOne({ _id: id, orgId })
    if (!acc) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(acc)
  }
  if (req.method === 'PUT') {
    const acc = await BankAccount.findOneAndUpdate({ _id: id, orgId }, req.body, { new: true })
    if (!acc) return res.status(404).json({ error: 'Not found' })
    audit(req, auth, { action: 'bank.update', entityType: 'BankAccount', entityId: acc._id, entityRef: acc.name })
    return res.status(200).json(acc)
  }
  if (req.method === 'DELETE') {
    const acc = await BankAccount.findOneAndDelete({ _id: id, orgId })
    if (!acc) return res.status(404).json({ error: 'Not found' })
    audit(req, auth, { action: 'bank.delete', entityType: 'BankAccount', entityId: acc._id, entityRef: acc.name })
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
