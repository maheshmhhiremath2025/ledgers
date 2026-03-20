import { connectDB } from '../../../lib/mongodb'
import Expense from '../../../models/Expense'

export default async function handler(req, res) {
  await connectDB()
  const { id } = req.query
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'PUT') {
    try {
      const data   = req.body
      const taxAmt = Math.round((data.amount || 0) * (data.tax || 0) / 100 * 100) / 100
      data.taxAmount = taxAmt
      data.total     = (data.amount || 0) + taxAmt
      const expense  = await Expense.findOneAndUpdate({ _id: id, orgId }, data, { new: true })
      if (!expense) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(expense)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    await Expense.findOneAndDelete({ _id: id, orgId })
    return res.status(200).json({ message: 'Deleted' })
  }

  res.status(405).end()
}