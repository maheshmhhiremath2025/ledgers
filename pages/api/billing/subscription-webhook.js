import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import crypto from 'crypto'

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const signature = req.headers['x-razorpay-signature']

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(rawBody)
    .digest('hex')

  if (expected !== signature) return res.status(400).json({ error: 'Invalid signature' })

  await connectDB()
  const event = JSON.parse(rawBody)

  try {
    const notes = event.payload?.subscription?.entity?.notes || {}
    const userId = notes.userId
    const planId = notes.planId

    if (!userId) return res.status(200).json({ received: true })

    const user = await User.findById(userId)
    if (!user) return res.status(200).json({ received: true })

    if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
      // Payment successful — extend plan by 1 month
      user.plan = planId || user.subscriptionPlan || 'professional'
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + 1)
      user.planExpiry = expiry
      user.trialEndsAt = null
      await user.save()
    }

    if (event.event === 'subscription.cancelled' || event.event === 'subscription.completed') {
      user.plan = 'starter'
      user.planExpiry = null
      user.razorpaySubId = null
      await user.save()
    }

    if (event.event === 'subscription.halted') {
      // Payment failed — downgrade after grace period
      user.plan = 'starter'
      user.planExpiry = null
      await user.save()
    }

    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('Subscription webhook error:', e.message)
    return res.status(200).json({ received: true })
  }
}