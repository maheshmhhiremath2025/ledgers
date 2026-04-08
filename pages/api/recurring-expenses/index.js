import { connectDB } from '../../../lib/mongodb'
import RecurringExpense from '../../../models/RecurringExpense'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    const items = await RecurringExpense.find({ orgId }).sort({ createdAt: -1 })
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (!data.name || !data.amount) return res.status(400).json({ error: 'name and amount required' })
      data.startDate = data.startDate ? new Date(data.startDate) : new Date()
      data.nextDate  = data.nextDate  ? new Date(data.nextDate)  : data.startDate
      const item = await RecurringExpense.create(data)
      return res.status(201).json(item)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}
