import { connectDB } from '../../../lib/mongodb'
import ApiKey from '../../../models/ApiKey'
import { requireAuth } from '../../../lib/auth'
import { generateApiKey } from '../../../lib/apikey'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    const keys = await ApiKey.find({ orgId }).select('-hash').sort({ createdAt: -1 })
    return res.status(200).json(keys)
  }

  if (req.method === 'POST') {
    const { name, scopes } = req.body || {}
    if (!name) return res.status(400).json({ error: 'Name required' })
    const { key, hash, prefix } = generateApiKey()
    const doc = await ApiKey.create({
      orgId, name, hash, prefix,
      scopes: Array.isArray(scopes) && scopes.length ? scopes : ['read','write'],
      createdBy: auth.userId,
    })
    audit(req, auth, { action: 'apikey.create', entityType: 'ApiKey', entityId: doc._id, entityRef: name })
    // Return the plaintext key ONCE
    return res.status(201).json({ key, id: doc._id, name, prefix, scopes: doc.scopes })
  }

  res.status(405).end()
}
