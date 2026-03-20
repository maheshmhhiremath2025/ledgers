import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { getSession, verifyToken } from '../../../lib/session'
import crypto from 'crypto'

function getAuth(req) {
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  return session
}

const PLAN_AMOUNTS = {
  professional: 99900,  // ₹999 in paise
  business:     249900, // ₹2,499 in paise
}

export default async function handler(req, res) {
  await connectDB()
  const session = getAuth(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const user = await User.findById(session.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'Only admins can manage billing' })

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')

  // POST — create a Razorpay subscription
  if (req.method === 'POST') {
    const { planId } = req.body
    if (!['professional','business'].includes(planId)) return res.status(400).json({ error: 'Invalid plan' })

    try {
      // Create Razorpay Plan if needed (or use existing)
      const planRes = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: 'monthly',
          interval: 1,
          item: {
            name: `Synergific Books ${planId === 'professional' ? 'Professional' : 'Business'} Plan`,
            amount: PLAN_AMOUNTS[planId],
            currency: 'INR',
            description: `Monthly subscription for ${planId} plan`,
          },
        }),
      })
      const plan = await planRes.json()
      if (!planRes.ok) throw new Error(plan.error?.description || 'Plan creation failed')

      // Create subscription
      const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          total_count: 12, // 12 months
          quantity: 1,
          customer_notify: 1,
          notes: {
            userId: String(user._id),
            orgId: user.orgId,
            planId,
          },
        }),
      })
      const sub = await subRes.json()
      if (!subRes.ok) throw new Error(sub.error?.description || 'Subscription creation failed')

      // Save subscription ID to user
      user.razorpaySubId = sub.id
      user.subscriptionPlan = planId
      await user.save()

      return res.status(200).json({
        subscriptionId: sub.id,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        prefill: { name: user.name, email: user.email },
        planId,
      })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // DELETE — cancel subscription
  if (req.method === 'DELETE') {
    if (!user.razorpaySubId) return res.status(400).json({ error: 'No active subscription' })
    try {
      await fetch(`https://api.razorpay.com/v1/subscriptions/${user.razorpaySubId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      })
      user.razorpaySubId = null
      await user.save()
      return res.status(200).json({ message: 'Subscription cancelled at end of billing cycle' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}