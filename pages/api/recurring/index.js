import { connectDB } from '../../../lib/mongodb'
import RecurringInvoice from '../../../models/RecurringInvoice'

function nextDate(from, frequency) {
  const d = new Date(from)
  switch (frequency) {
    case 'Weekly':    d.setDate(d.getDate() + 7);   break
    case 'Monthly':   d.setMonth(d.getMonth() + 1); break
    case 'Quarterly': d.setMonth(d.getMonth() + 3); break
    case 'Yearly':    d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    try {
      const list = await RecurringInvoice.find({ orgId }).sort({ createdAt: -1 })
      return res.status(200).json({ recurring: list })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      // Compute first nextRunDate = startDate
      data.nextRunDate = new Date(data.startDate)
      const item = await RecurringInvoice.create(data)
      return res.status(201).json(item)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}