import { connectDB } from '../../../lib/mongodb'
import RecurringInvoice from '../../../models/RecurringInvoice'

export default async function handler(req, res) {
  await connectDB()
  const { id } = req.query

  if (req.method === 'PUT') {
    try {
      const item = await RecurringInvoice.findByIdAndUpdate(id, req.body, { new: true })
      return res.status(200).json(item)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    await RecurringInvoice.findByIdAndDelete(id)
    return res.status(200).json({ message: 'Deleted' })
  }

  res.status(405).end()
}