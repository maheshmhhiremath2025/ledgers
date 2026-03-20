import { connectDB } from '../../../lib/mongodb'

export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) return res.status(401).end()
  const conn = await connectDB()
  const collection = conn.connection.db.collection('users')
  try {
    await collection.dropIndex('email_1').catch(() => {})
    await collection.createIndex({ email: 1, orgId: 1 }, { unique: true })
    await collection.createIndex({ email: 1 })
    return res.status(200).json({ message: 'Indexes fixed' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}