import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { setSessionCookie, createToken } from '../../../lib/session'
import { verifyTotp } from '../../../lib/totp'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const { email, password, totpCode, backupCode, emailOtp } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  // Find the primary org record (admin role, earliest created) for this email
  const allUsers = await User.find({ email: email.toLowerCase() }).sort({ createdAt: 1 })
  if (!allUsers.length) return res.status(401).json({ error: 'Invalid email or password' })

  // Try to verify password against any of the user's org records
  const user = allUsers.find(u => u.verifyPassword(password)) || null
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })
  if (!user.active) return res.status(403).json({ error: 'Account disabled' })

  // 2FA gate
  if (user.twoFactorEnabled) {
    if (!totpCode && !backupCode && !emailOtp) {
      return res.status(401).json({ error: '2FA code required', requires2FA: true })
    }
    let ok = false
    // 1. TOTP from authenticator app
    if (totpCode && verifyTotp(user.twoFactorSecret, totpCode)) ok = true
    // 2. Backup code (single-use)
    if (!ok && backupCode) {
      const h = crypto.createHash('sha256').update(String(backupCode).trim()).digest('hex')
      const idx = user.twoFactorBackupCodes.indexOf(h)
      if (idx >= 0) {
        user.twoFactorBackupCodes.splice(idx, 1)
        await user.save()
        ok = true
      }
    }
    // 3. Email OTP fallback
    if (!ok && emailOtp) {
      const h = crypto.createHash('sha256').update(String(emailOtp).trim()).digest('hex')
      if (user.emailOtp === h && user.emailOtpExpiry && user.emailOtpExpiry > new Date()) {
        user.emailOtp = null
        user.emailOtpExpiry = null
        await user.save()
        ok = true
      }
    }
    if (!ok) return res.status(401).json({ error: 'Invalid 2FA code', requires2FA: true })
  }

  // Transparently upgrade legacy/weak password hashes
  if (user.needsPasswordRehash && user.needsPasswordRehash()) {
    try { user.setPassword(password); await user.save() }
    catch (e) { console.error('[login] password rehash failed:', e.message) }
  }

  const payload = {
    userId: String(user._id),
    email:  user.email,
    name:   user.name,
    orgId:  user.orgId,
    role:   user.role,
    plan:   user.plan || 'starter',
  }

  setSessionCookie(res, payload)
  const token = createToken(payload)

  return res.status(200).json({
    user: payload,
    token, // return token so client can store in localStorage as backup
  })
}