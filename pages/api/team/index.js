import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import OrgConfig from '../../../models/OrgConfig'
import { getSession, verifyToken } from '../../../lib/session'

// Auth helper
function getAuth(req) {
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  return session
}

export default async function handler(req, res) {
  await connectDB()
  const session = getAuth(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const orgId = req.headers['x-org-id'] || session.orgId || 'default'

  // GET — list all team members
  if (req.method === 'GET') {
    const members = await User.find({ orgId }).select('-passwordHash -inviteToken')
    const me = await User.findById(session.userId)
    return res.status(200).json({ members, myRole: me?.role || 'viewer' })
  }

  // POST — invite a new member
  if (req.method === 'POST') {
    const me = await User.findById(session.userId)
    if (me?.role !== 'admin') return res.status(403).json({ error: 'Only admins can invite members' })

    // Check Business plan limit (5 members)
    const count = await User.countDocuments({ orgId, status: { $ne: 'disabled' } })
    if (me.plan !== 'business' && count >= 1) {
      return res.status(403).json({ error: 'Team members require the Business plan', upgrade: true })
    }
    if (count >= 5) {
      return res.status(403).json({ error: 'Business plan allows up to 5 team members' })
    }

    const { email, role, name } = req.body
    if (!email || !role) return res.status(400).json({ error: 'Email and role required' })
    if (!['admin','accountant','viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' })

    // Check if already a member
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing && existing.orgId === orgId) return res.status(400).json({ error: 'User already in this organisation' })

    const inviteToken = crypto.randomBytes(32).toString('hex')
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create pending user
    const invited = new User({
      name:         name || email.split('@')[0],
      email:        email.toLowerCase(),
      orgId,
      role,
      status:       'invited',
      active:       false,
      inviteToken,
      inviteExpiry,
      invitedBy:    session.userId,
      plan:         'starter',
    })
    invited.setPassword(crypto.randomBytes(16).toString('hex')) // temp password
    await invited.save()

    // Send invite email
    const cfg = await OrgConfig.findOne({ orgId })
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`

    try {
      const smtpHost = cfg?.smtpHost || process.env.SMTP_HOST
      const smtpUser = cfg?.smtpUser || process.env.SMTP_USER
      const smtpPass = cfg?.smtpPass || process.env.SMTP_PASS
      const smtpFrom = cfg?.smtpFrom || process.env.SMTP_FROM || smtpUser

      if (smtpHost && smtpUser && smtpPass) {
        const nodemailer = require('nodemailer')
        const transport = nodemailer.createTransport({
          host: smtpHost, port: cfg?.smtpPort || 587,
          secure: cfg?.smtpSecure || false,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        })
        await transport.sendMail({
          from:    smtpFrom,
          to:      email,
          subject: `You've been invited to ${cfg?.businessName || 'Synergific Books'}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;color:#333">
              <h2 style="color:#6366F1">You're invited!</h2>
              <p><b>${me.name}</b> has invited you to join <b>${cfg?.businessName || orgId}</b> on Synergific Books as <b>${role}</b>.</p>
              <p>Click the button below to accept the invitation and set up your account:</p>
              <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6366F1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Accept Invitation →</a>
              <p style="color:#888;font-size:12px">This link expires in 7 days. If you didn't expect this, you can ignore this email.</p>
            </div>
          `,
        })
      }
    } catch (e) { console.error('Invite email error:', e.message) }

    return res.status(201).json({
      message: `Invitation sent to ${email}`,
      inviteUrl, // also return URL in case email fails
      member: { _id: invited._id, name: invited.name, email: invited.email, role: invited.role, status: invited.status },
    })
  }

  res.status(405).end()
}