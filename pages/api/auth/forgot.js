import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'Email required' })

  const users = await User.find({ email: email.toLowerCase() })

  // Always return success to avoid email enumeration
  if (users.length === 0) {
    return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Set the same reset token on every org record for this email
  for (const u of users) {
    u.resetToken = token
    u.resetExpiry = expiry
    await u.save()
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.host}`
  const resetUrl = `${baseUrl}/reset/${token}`

  try {
    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpPort = Number(process.env.SMTP_PORT || 587)
    const smtpFrom = process.env.SMTP_FROM || smtpUser

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('SMTP not configured for password reset')
      return res.status(500).json({ error: 'Email service not configured' })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:28px 32px">
      <div style="color:#fff;font-size:22px;font-weight:700">Reset your password</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px">HexaLabs Books</div>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7">
        Hi ${users[0].name || 'there'},<br><br>
        We received a request to reset your password. Click the button below to set a new one. This link will expire in 1 hour.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${resetUrl}" style="display:inline-block;background:#6366F1;color:#fff;padding:13px 34px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;box-shadow:0 4px 12px rgba(99,102,241,0.35)">
          Reset Password
        </a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;color:#6B7280;line-height:1.6">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${resetUrl}" style="color:#6366F1;word-break:break-all">${resetUrl}</a>
      </p>
      <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;line-height:1.6">
        If you didn't request this, you can safely ignore this email — your password will not be changed.
      </p>
    </div>
    <div style="background:#f9fafb;padding:14px 32px;text-align:center;font-size:11px;color:#9CA3AF">
      © HexaLabs Books
    </div>
  </div>
</body></html>`

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Reset your HexaLabs Books password',
      html,
    })

    return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' })
  } catch (e) {
    console.error('Password reset email failed:', e)
    return res.status(500).json({ error: 'Failed to send reset email' })
  }
}
