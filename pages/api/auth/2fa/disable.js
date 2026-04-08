import { connectDB } from '../../../../lib/mongodb'
import User from '../../../../models/User'
import { requireAuth } from '../../../../lib/auth'
import { verifyTotp } from '../../../../lib/totp'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const user = await User.findById(auth.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.twoFactorEnabled) return res.status(400).json({ error: '2FA not enabled' })

  const { code } = req.body || {}
  if (!verifyTotp(user.twoFactorSecret, code)) {
    return res.status(400).json({ error: 'Invalid code' })
  }

  user.twoFactorEnabled = false
  user.twoFactorSecret  = null
  user.twoFactorBackupCodes = []
  await user.save()
  return res.status(200).json({ disabled: true })
}
