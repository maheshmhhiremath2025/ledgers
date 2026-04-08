import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import Webhook from '../../../models/Webhook'
import { requireAuth } from '../../../lib/auth'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    const hooks = await Webhook.find({ orgId }).sort({ createdAt: -1 })
    return res.status(200).json(hooks)
  }

  if (req.method === 'POST') {
    const { url, events } = req.body || {}
    if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ error: 'Valid URL required' })
    const secret = 'whsec_' + crypto.randomBytes(24).toString('hex')
    const w = await Webhook.create({
      orgId, url, secret,
      events: Array.isArray(events) && events.length ? events : ['*'],
    })
    audit(req, auth, { action: 'webhook.create', entityType: 'Webhook', entityId: w._id, entityRef: url })
    return res.status(201).json(w)
  }
  res.status(405).end()
}
