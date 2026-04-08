import { connectDB } from '../../../lib/mongodb'
import Webhook from '../../../models/Webhook'
import { requireAuth } from '../../../lib/auth'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'PUT') {
    const w = await Webhook.findOneAndUpdate({ _id: id, orgId }, req.body, { new: true })
    if (!w) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(w)
  }
  if (req.method === 'DELETE') {
    const w = await Webhook.findOneAndDelete({ _id: id, orgId })
    if (!w) return res.status(404).json({ error: 'Not found' })
    audit(req, auth, { action: 'webhook.delete', entityType: 'Webhook', entityId: id, entityRef: w.url })
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
