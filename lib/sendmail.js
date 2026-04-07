import nodemailer from 'nodemailer'

// Generic mail sender for SYSTEM emails (welcome, password reset, plan upgrade, etc.)
// Uses SMTP env vars only — does NOT depend on per-org config.
export async function sendSystemMail({ to, subject, html }) {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpPort = Number(process.env.SMTP_PORT || 587)
  const smtpFrom = process.env.SMTP_FROM || smtpUser

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('System SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS)')
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  })

  return transporter.sendMail({ from: smtpFrom, to, subject, html })
}

const PLAN_INFO = {
  starter:      { name: 'Starter',      price: '₹0 / forever',  features: ['5 invoices / month', '3 purchase orders / month', '1 organisation', 'Classic PDF template'] },
  professional: { name: 'Professional', price: '₹999 / month',  features: ['Unlimited invoices & POs', 'All 5 PDF templates', 'Logo & GST config', 'Saved customers & vendors', 'Authorized signatory on PDF'] },
  business:     { name: 'Business',     price: '₹2,499 / month', features: ['Everything in Professional', '2 organisations', '5 team members', 'CSV / Excel export', 'API access', 'Priority support'] },
}

function shell(title, body) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif">
  <div style="max-width:580px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:28px 32px">
      <div style="color:#fff;font-size:22px;font-weight:700">${title}</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px">HexaLabs Books</div>
    </div>
    <div style="padding:28px 32px;color:#374151;font-size:14px;line-height:1.7">${body}</div>
    <div style="background:#f9fafb;padding:14px 32px;text-align:center;font-size:11px;color:#9CA3AF">© HexaLabs Books</div>
  </div>
</body></html>`
}

function planCard(planId) {
  const p = PLAN_INFO[planId] || PLAN_INFO.starter
  const features = p.features.map(f => `<li style="margin-bottom:6px">${f}</li>`).join('')
  return `<div style="background:#F5F6FB;border:1px solid #E5E7EB;border-radius:10px;padding:18px 20px;margin:18px 0">
    <div style="font-size:11px;color:#6366F1;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Your Plan</div>
    <div style="font-size:20px;font-weight:700;color:#111;margin-top:4px">${p.name}</div>
    <div style="font-size:13px;color:#6B7280;margin-bottom:12px">${p.price}</div>
    <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#374151">${features}</ul>
  </div>`
}

export function welcomeEmailHtml({ name, planId }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ledgers.hexalabs.online'
  return shell('Welcome to HexaLabs Books! 🎉', `
    <p>Hi ${name || 'there'},</p>
    <p>Your account is ready. Thanks for signing up — we're glad to have you on board.</p>
    ${planCard(planId)}
    <div style="text-align:center;margin:24px 0">
      <a href="${appUrl}/app" style="display:inline-block;background:#6366F1;color:#fff;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Go to your dashboard</a>
    </div>
    <p style="font-size:12px;color:#9CA3AF;margin-top:24px">If you didn't create this account, please ignore this email or contact support.</p>
  `)
}

export function planUpgradeEmailHtml({ name, planId }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ledgers.hexalabs.online'
  const p = PLAN_INFO[planId] || PLAN_INFO.starter
  return shell(`${p.name} plan activated ✨`, `
    <p>Hi ${name || 'there'},</p>
    <p>Your payment was successful and your <b>${p.name}</b> plan is now active. Thank you for upgrading!</p>
    ${planCard(planId)}
    <div style="text-align:center;margin:24px 0">
      <a href="${appUrl}/app" style="display:inline-block;background:#6366F1;color:#fff;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Open dashboard</a>
    </div>
    <p style="font-size:12px;color:#9CA3AF">Your subscription will renew in 30 days. You can manage your plan from Billing settings.</p>
  `)
}
