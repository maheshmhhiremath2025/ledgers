import { connectDB } from '../../../lib/mongodb'
import ApiKey from '../../../models/ApiKey'
import { requireAuth } from '../../../lib/auth'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'DELETE') {
    const k = await ApiKey.findOneAndDelete({ _id: id, orgId })
    if (!k) return res.status(404).json({ error: 'Not found' })
    audit(req, auth, { action: 'apikey.delete', entityType: 'ApiKey', entityId: id, entityRef: k.name })
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
