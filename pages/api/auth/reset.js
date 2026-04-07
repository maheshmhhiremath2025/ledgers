import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const { token, password } = req.body || {}
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' })
  if (password.length < 6)  return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const users = await User.find({ resetToken: token })
  if (!users.length) return res.status(400).json({ error: 'Invalid or expired reset link' })

  const valid = users.filter(u => u.resetExpiry && new Date() < new Date(u.resetExpiry))
  if (!valid.length) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' })

  // Update password on every org record for this user
  for (const u of valid) {
    u.setPassword(password)
    u.resetToken  = null
    u.resetExpiry = null
    await u.save()
  }

  return res.status(200).json({ message: 'Password updated. You can now sign in.' })
}
