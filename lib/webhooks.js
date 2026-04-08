import crypto from 'crypto'
import Webhook from '../models/Webhook'
import { connectDB } from './mongodb'

// Fire-and-forget webhook delivery. Never blocks the user-facing operation.
//
// Usage:
//   fireWebhook(orgId, 'invoice.created', { invoice }).catch(() => {})
export async function fireWebhook(orgId, event, payload) {
  try {
    await connectDB()
    const subs = await Webhook.find({ orgId, active: true }).lean()
    for (const sub of subs) {
      const matches = sub.events.includes('*') || sub.events.includes(event)
      if (!matches) continue
      deliver(sub, event, payload).catch(e => console.error('[webhook] delivery error:', e.message))
    }
  } catch (e) {
    console.error('[webhook] dispatch error:', e.message)
  }
}

async function deliver(sub, event, payload) {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    orgId: sub.orgId,
    data: payload,
  })
  const signature = crypto.createHmac('sha256', sub.secret).update(body).digest('hex')

  let status = 0
  try {
    const r = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'X-HexaLabs-Event':   event,
        'X-HexaLabs-Signature':`sha256=${signature}`,
        'User-Agent':         'HexaLabs-Books-Webhook/1.0',
      },
      body,
    })
    status = r.status
  } catch (e) {
    console.error('[webhook] HTTP error:', e.message)
  }

  const update = { lastDeliveryAt: new Date(), lastStatus: status }
  if (status >= 200 && status < 300) update.consecutiveFailures = 0
  else update.$inc = { consecutiveFailures: 1 }
  await Webhook.updateOne({ _id: sub._id }, update).catch(() => {})

  // Auto-disable after 10 consecutive failures
  if (status === 0 || status >= 400) {
    const fresh = await Webhook.findById(sub._id).lean()
    if (fresh && fresh.consecutiveFailures >= 10) {
      await Webhook.updateOne({ _id: sub._id }, { active: false }).catch(() => {})
    }
  }
}
