import User from '../models/User'
import { getSession, verifyToken } from './session'

function allowedEmails() {
  return (process.env.SUPERADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function requireSuperAdmin(req, res) {
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  if (!session) { res.status(401).json({ error: 'Not authenticated' }); return null }

  const user = await User.findById(session.userId)
  if (!user) { res.status(401).json({ error: 'User not found' }); return null }

  const list = allowedEmails()
  if (!list.includes((user.email || '').toLowerCase())) {
    res.status(403).json({ error: 'Forbidden — superadmin only' })
    return null
  }
  return user
}

export function isSuperAdminEmail(email) {
  return allowedEmails().includes((email || '').toLowerCase())
}
