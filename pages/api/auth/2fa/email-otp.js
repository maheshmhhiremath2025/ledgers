import crypto from 'crypto'
import { connectDB } from '../../../../lib/mongodb'
import User from '../../../../models/User'
import { sendSystemMail } from '../../../../lib/sendmail'

// Sends a 6-digit OTP to the user's email as a 2FA fallback.
// Requires email + password (already validated on client before reaching 2FA prompt).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const users = await User.find({ email: email.toLowerCase() }).sort({ createdAt: 1 })
  const user = users.find(u => u.verifyPassword(password))
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  if (!user.twoFactorEnabled) return res.status(400).json({ error: '2FA is not enabled' })

  // Generate 6-digit OTP, valid for 10 minutes
  const otp = String(crypto.randomInt(100000, 999999))
  user.emailOtp = crypto.createHash('sha256').update(otp).digest('hex')
  user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000)
  await user.save()

  // Send email
  const masked = email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
  try {
    await sendSystemMail({
      to: user.email,
      subject: `${otp} — HexaLabs Books login code`,
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:28px 32px">
      <div style="color:#fff;font-size:20px;font-weight:700">Login Verification Code</div>
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">HexaLabs Books</div>
    </div>
    <div style="padding:28px 32px;text-align:center">
      <p style="color:#374151;font-size:14px;margin:0 0 18px">Use this code to complete your sign-in:</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#6366F1;padding:16px;background:#F5F6FB;border-radius:10px;display:inline-block;font-family:'Courier New',monospace">${otp}</div>
      <p style="color:#9CA3AF;font-size:12px;margin-top:16px">This code expires in 10 minutes. If you didn't try to log in, ignore this email.</p>
    </div>
    <div style="background:#f9fafb;padding:14px 32px;text-align:center;font-size:11px;color:#9CA3AF">© HexaLabs Books</div>
  </div>
</body></html>`,
    })
  } catch (e) {
    console.error('[email-otp] send failed:', e.message)
    return res.status(500).json({ error: 'Failed to send email. Check SMTP configuration.' })
  }

  return res.status(200).json({ sent: true, email: masked })
}
