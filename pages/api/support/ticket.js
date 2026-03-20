import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, orgId, plan, subject, category, priority, message, phone } = req.body
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Name, email, subject and message are required' })
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpPort = process.env.SMTP_PORT || 587

  if (!smtpUser || !smtpPass) {
    return res.status(500).json({ error: 'Email not configured on server' })
  }

  const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost, port: Number(smtpPort),
      secure: smtpPort == 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `Synergific Books Support <${smtpUser}>`,
      to: 'itops@synergificsoftware.com',
      replyTo: email,
      subject: `[${ticketId}] [${priority}] ${category} — ${subject}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#1a1a2e">
        <div style="background:#6366F1;padding:20px 24px;border-radius:10px 10px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">🎫 New Support Ticket</h2>
          <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px">${ticketId} · ${now} IST</div>
        </div>
        <div style="background:#f8f9ff;padding:20px 24px;border:1px solid #e0e0ef;border-top:none">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:6px 0;color:#666;width:120px">Name</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${email}">${email}</a></td></tr>
            ${phone?`<tr><td style="padding:6px 0;color:#666">Phone</td><td style="padding:6px 0">${phone}</td></tr>`:''}
            ${orgId?`<tr><td style="padding:6px 0;color:#666">Org ID</td><td style="padding:6px 0;font-family:monospace">${orgId}</td></tr>`:''}
            ${plan?`<tr><td style="padding:6px 0;color:#666">Plan</td><td style="padding:6px 0;font-weight:600;color:#6366F1;text-transform:capitalize">${plan}</td></tr>`:''}
            <tr><td style="padding:6px 0;color:#666">Category</td><td style="padding:6px 0">${category}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Priority</td><td style="padding:6px 0"><span style="background:${priority==='High'?'#fee2e2':priority==='Medium'?'#fef3c7':'#dcfce7'};color:${priority==='High'?'#dc2626':priority==='Medium'?'#d97706':'#16a34a'};padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600">${priority}</span></td></tr>
          </table>
          <div style="margin-top:16px;padding:14px;background:#fff;border:1px solid #e0e0ef;border-radius:8px">
            <div style="font-size:12px;color:#666;margin-bottom:6px;font-weight:600">SUBJECT</div>
            <div style="font-size:15px;font-weight:600">${subject}</div>
          </div>
          <div style="margin-top:12px;padding:14px;background:#fff;border:1px solid #e0e0ef;border-radius:8px">
            <div style="font-size:12px;color:#666;margin-bottom:6px;font-weight:600">MESSAGE</div>
            <div style="font-size:14px;line-height:1.7;color:#333">${message.replace(/\n/g,'<br>')}</div>
          </div>
        </div>
        <div style="background:#eef0ff;padding:12px 24px;border-radius:0 0 10px 10px;font-size:12px;color:#666;border:1px solid #e0e0ef;border-top:none">
          Reply to this email to respond directly to ${name}
        </div>
      </div>`,
    })

    await transporter.sendMail({
      from: `Synergific Books <${smtpUser}>`,
      to: email,
      subject: `[${ticketId}] We received your support request`,
      html: `<div style="font-family:Arial,sans-serif;max-width:580px;color:#1a1a2e">
        <div style="background:#6366F1;padding:20px 24px;border-radius:10px 10px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">✅ Support Request Received</h2>
          <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px">Ticket ID: ${ticketId}</div>
        </div>
        <div style="background:#f8f9ff;padding:24px;border:1px solid #e0e0ef;border-top:none">
          <p style="font-size:15px;margin:0 0 16px">Hi <b>${name}</b>,</p>
          <p style="font-size:14px;line-height:1.7;color:#444;margin:0 0 16px">Thank you for reaching out. We've received your support request and our team will get back to you shortly.</p>
          <div style="background:#fff;border:1px solid #e0e0ef;border-radius:8px;padding:14px;margin-bottom:20px">
            <div style="font-size:12px;color:#888;margin-bottom:4px">YOUR REQUEST</div>
            <div style="font-weight:600;font-size:14px">${subject}</div>
            <div style="font-size:12px;color:#888;margin-top:4px">${category} · ${priority} Priority</div>
          </div>
          <div style="background:#eef0ff;border-radius:8px;padding:14px">
            <div style="font-size:13px;font-weight:600;color:#6366F1;margin-bottom:10px">Need faster help?</div>
            <div style="font-size:13px;color:#444;margin-bottom:6px">📧 <a href="mailto:itops@synergificsoftware.com" style="color:#6366F1">itops@synergificsoftware.com</a></div>
            <div style="font-size:13px;color:#444;margin-bottom:6px">📞 <a href="tel:+918884907660" style="color:#6366F1">+91 88849 07660</a></div>
            <div style="font-size:13px;color:#444">💬 <a href="https://wa.me/918884907660" style="color:#25D366">WhatsApp: +91 88849 07660</a></div>
          </div>
        </div>
        <div style="background:#eef0ff;padding:12px 24px;border-radius:0 0 10px 10px;font-size:12px;color:#666;border:1px solid #e0e0ef;border-top:none;text-align:center">
          © ${new Date().getFullYear()} Synergific Software
        </div>
      </div>`,
    })

    return res.status(200).json({ success: true, ticketId })
  } catch (e) {
    return res.status(500).json({ error: `Failed to send: ${e.message}` })
  }
}