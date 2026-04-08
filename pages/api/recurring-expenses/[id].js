import { connectDB } from '../../../lib/mongodb'
import RecurringExpense from '../../../models/RecurringExpense'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'PUT') {
    const item = await RecurringExpense.findOneAndUpdate({ _id: id, orgId }, req.body, { new: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(item)
  }
  if (req.method === 'DELETE') {
    const item = await RecurringExpense.findOneAndDelete({ _id: id, orgId })
    if (!item) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
