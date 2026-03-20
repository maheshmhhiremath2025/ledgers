import crypto from 'crypto'

const SECRET = process.env.SESSION_SECRET || 'synergific-books-secret-key-change-in-prod'

export function createToken(payload) {
  const data = JSON.stringify({ ...payload, iat: Date.now() })
  const encoded = Buffer.from(data).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifyToken(token) {
  try {
    const [encoded, sig] = token.split('.')
    const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url')
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(encoded, 'base64url').toString())
  } catch {
    return null
  }
}

export function getSession(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/session=([^;]+)/)
  if (!match) return null
  return verifyToken(match[1])
}

export function setSessionCookie(res, payload) {
  const token = createToken(payload)
  res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`)
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0')
}
