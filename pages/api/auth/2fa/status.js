import { connectDB } from '../../../../lib/mongodb'
import User from '../../../../models/User'
import { requireAuth } from '../../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const user = await User.findById(auth.userId).select('twoFactorEnabled twoFactorBackupCodes')
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.status(200).json({
    enabled: !!user.twoFactorEnabled,
    backupCodesRemaining: (user.twoFactorBackupCodes || []).length,
  })
}
