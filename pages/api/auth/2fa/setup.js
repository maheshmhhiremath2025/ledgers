import crypto from 'crypto'
import { connectDB } from '../../../../lib/mongodb'
import User from '../../../../models/User'
import { requireAuth } from '../../../../lib/auth'
import { generateSecret, otpauthUrl, verifyTotp } from '../../../../lib/totp'

// POST /api/auth/2fa/setup        → returns { secret, otpauthUrl } (does NOT enable yet)
// POST /api/auth/2fa/setup verify  → with { secret, code } enables 2FA and returns backup codes
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const user = await User.findById(auth.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { code, secret: incomingSecret } = req.body || {}

  // Step 2: verify and enable
  if (code && incomingSecret) {
    if (!verifyTotp(incomingSecret, code)) {
      return res.status(400).json({ error: 'Invalid code. Check your authenticator app and try again.' })
    }
    // Generate 10 backup codes
    const plainCodes = []
    const hashed = []
    for (let i = 0; i < 10; i++) {
      const c = crypto.randomBytes(4).toString('hex') // 8 hex chars
      plainCodes.push(c)
      hashed.push(crypto.createHash('sha256').update(c).digest('hex'))
    }
    user.twoFactorEnabled = true
    user.twoFactorSecret  = incomingSecret
    user.twoFactorBackupCodes = hashed
    await user.save()
    return res.status(200).json({ enabled: true, backupCodes: plainCodes })
  }

  // Step 1: provision a new secret (not yet saved)
  const secret = generateSecret()
  const url = otpauthUrl({ secret, label: user.email })
  return res.status(200).json({ secret, otpauthUrl: url })
}
