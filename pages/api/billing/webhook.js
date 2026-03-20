import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const signature = req.headers['x-razorpay-signature']

  // Verify webhook signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (expectedSig !== signature) {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  let event
  try { event = JSON.parse(rawBody) } catch { return res.status(400).end() }

  await connectDB()

  const { event: eventType, payload } = event

  if (eventType === 'payment.captured') {
    const notes = payload?.payment?.entity?.notes || {}
    const { userId, plan } = notes

    if (userId && plan) {
      const user = await User.findById(userId)
      if (user) {
        const expiry = new Date()
        expiry.setMonth(expiry.getMonth() + 1)
        user.plan = plan
        user.planExpiry = expiry
        user.trialEndsAt = null
        user.invoiceCount = 0
        user.poCount = 0
        await user.save()
        console.log(`Plan ${plan} activated for user ${userId} via webhook`)
      }
    }
  }

  if (eventType === 'subscription.charged') {
    // Handle recurring subscription renewals
    const notes = payload?.subscription?.entity?.notes || {}
    const { userId, plan } = notes
    if (userId && plan) {
      const user = await User.findById(userId)
      if (user) {
        const expiry = new Date()
        expiry.setMonth(expiry.getMonth() + 1)
        user.plan = plan
        user.planExpiry = expiry
        user.invoiceCount = 0
        user.poCount = 0
        await user.save()
      }
    }
  }

  if (eventType === 'payment.failed') {
    // Could notify user — for now just log
    console.log('Payment failed:', payload?.payment?.entity?.notes)
  }

  return res.status(200).json({ received: true })
}