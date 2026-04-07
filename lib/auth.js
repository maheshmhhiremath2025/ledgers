import { getSession, verifyToken } from './session'

// Returns the verified session or null. Sends 401 if no session and responds.
// Usage:
//   const auth = requireAuth(req, res)
//   if (!auth) return
//   const orgId = auth.orgId
export function requireAuth(req, res) {
  let session = getSession(req)
  if (!session) {
    const a = (req.headers && req.headers['authorization']) || ''
    if (a.startsWith('Bearer ')) session = verifyToken(a.slice(7))
  }
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' })
    return null
  }
  return session
}

// Same but doesn't respond — returns the session or null. Use when you handle the response yourself.
export function getAuth(req) {
  let session = getSession(req)
  if (!session) {
    const a = (req.headers && req.headers['authorization']) || ''
    if (a.startsWith('Bearer ')) session = verifyToken(a.slice(7))
  }
  return session || null
}
