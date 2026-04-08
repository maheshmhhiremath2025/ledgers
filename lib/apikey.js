import crypto from 'crypto'
import ApiKey from '../models/ApiKey'
import { connectDB } from './mongodb'

export function generateApiKey() {
  const random = crypto.randomBytes(20).toString('hex') // 40 chars
  const key = `hxlb_live_${random}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const prefix = key.slice(0, 14) // hxlb_live_xxxx
  return { key, hash, prefix }
}

export function hashKey(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex')
}

// Resolve an Authorization: Bearer <key> header to an org context.
// Returns { orgId, scopes, keyId } or null on failure.
// Sends 401 if shouldRespond is true and no key is found.
export async function requireApiKey(req, res, { writeRequired = false } = {}) {
  await connectDB()
  const auth = req.headers['authorization'] || ''
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' })
    return null
  }
  const plain = auth.slice(7).trim()
  if (!plain.startsWith('hxlb_')) {
    res.status(401).json({ error: 'Invalid API key format' })
    return null
  }
  const hash = hashKey(plain)
  const k = await ApiKey.findOne({ hash, active: true })
  if (!k) {
    res.status(401).json({ error: 'Invalid or revoked API key' })
    return null
  }
  if (writeRequired && !k.scopes.includes('write')) {
    res.status(403).json({ error: 'API key lacks write scope' })
    return null
  }
  // Fire-and-forget last-used update
  ApiKey.updateOne({ _id: k._id }, { lastUsedAt: new Date() }).catch(() => {})
  return { orgId: k.orgId, scopes: k.scopes, keyId: String(k._id) }
}
