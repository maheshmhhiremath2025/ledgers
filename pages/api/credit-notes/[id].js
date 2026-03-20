import { connectDB } from '../../../lib/mongodb'
import CreditNote from '../../../models/CreditNote'

export default async function handler(req, res) {
  await connectDB()
  const { id } = req.query
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    const cn = await CreditNote.findOne({ _id: id, orgId })
    if (!cn) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(cn)
  }

  if (req.method === 'DELETE') {
    await CreditNote.findOneAndDelete({ _id: id, orgId })
    return res.status(200).json({ message: 'Deleted' })
  }
  res.status(405).end()
}