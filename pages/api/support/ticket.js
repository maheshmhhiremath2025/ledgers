// Proxy to centralized HexaLabs Support System
const SUPPORT_URL = process.env.SUPPORT_API_URL
const API_KEY     = process.env.SUPPORT_API_KEY
const APP_ID      = process.env.SUPPORT_APP_ID || 'ledgers'

export default async function handler(req, res) {
  if (!SUPPORT_URL || !API_KEY) {
    return res.status(500).json({ error: 'Support system not configured' })
  }

  // POST: create ticket
  if (req.method === 'POST') {
    const { name, email, subject, message, category, priority, orgId, plan } = req.body
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject and message are required' })
    }

    // Map local categories to support system categories
    const catMap = {
      'Billing & Payments': 'Billing',
      'Invoice Issue': 'Technical Issue',
      'Technical Problem': 'Technical Issue',
      'Account & Login': 'Account',
      'Feature Request': 'Feature Request',
      'GST / Tax Query': 'General',
      'Data / Export': 'Technical Issue',
      'Other': 'General',
    }

    try {
      const r = await fetch(SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          app: APP_ID,
          userEmail: email,
          userName: name,
          subject,
          message,
          category: catMap[category] || 'General',
          priority: priority === 'High' ? 'High' : priority === 'Low' ? 'Low' : 'Normal',
          externalUserId: orgId || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Support system error')
      return res.status(200).json({ success: true, ticketId: d.ticket?.ticketNo || d.ticket?.id })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // GET: list tickets for a user
  if (req.method === 'GET') {
    const { email, ticketNo } = req.query
    if (!email && !ticketNo) return res.status(400).json({ error: 'email or ticketNo required' })

    try {
      const qs = ticketNo ? `ticketNo=${ticketNo}` : `email=${encodeURIComponent(email)}`
      const r = await fetch(`${SUPPORT_URL}?${qs}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      })
      const d = await r.json()
      return res.status(200).json(d)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // PUT: reply or close
  if (req.method === 'PUT') {
    const { ticketNo, action, message, userName } = req.body
    if (!ticketNo || !action) return res.status(400).json({ error: 'ticketNo and action required' })

    try {
      const r = await fetch(SUPPORT_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({ ticketNo, action, message, userName }),
      })
      const d = await r.json()
      return res.status(r.status).json(d)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(405).end()
}
