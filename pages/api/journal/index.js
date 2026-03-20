import { connectDB } from '../../../lib/mongodb'
import JournalEntry from '../../../models/JournalEntry'
import Account from '../../../models/Account'
import { postJournalEntry } from '../../../lib/journal'

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 30, search, from, to, status } = req.query
      const query = { orgId }
      if (status) query.status = status
      if (from || to) {
        query.date = {}
        if (from) query.date.$gte = new Date(from)
        if (to)   query.date.$lte = new Date(to)
      }
      if (search) query.$or = [
        { entryNumber: { $regex: search, $options: 'i' } },
        { narration:   { $regex: search, $options: 'i' } },
        { reference:   { $regex: search, $options: 'i' } },
      ]
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const [entries, total] = await Promise.all([
        JournalEntry.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        JournalEntry.countDocuments(query),
      ])
      return res.status(200).json({ entries, total })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const { date, narration, reference, lines, currency } = req.body
      if (!narration || !lines?.length) return res.status(400).json({ error: 'Narration and lines are required' })

      // Resolve account IDs from codes if needed
      const resolvedLines = await Promise.all(lines.map(async l => {
        if (!l.accountId && l.accountCode) {
          const acc = await Account.findOne({ orgId, code: l.accountCode })
          if (acc) return { ...l, accountId: acc._id, accountName: acc.name }
        }
        return l
      }))

      const entry = await postJournalEntry(orgId, {
        date, narration, reference, currency,
        sourceType: 'Manual',
        lines: resolvedLines,
      })
      return res.status(201).json(entry)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}