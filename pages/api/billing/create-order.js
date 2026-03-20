import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { getSession, verifyToken } from '../../../lib/session'
import { PLANS } from '../../../lib/plans'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  // Auth: cookie → Bearer token → userId in body
  let session = getSession(req)
  if (!session) {
    const auth = req.headers['authorization'] || ''
    if (auth.startsWith('Bearer ')) session = verifyToken(auth.slice(7))
  }
  if (!session && req.body?.userId) {
    session = { userId: req.body.userId }
  }
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const { plan } = req.body
  if (!plan || !PLANS[plan] || plan === 'starter') {
    return res.status(400).json({ error: 'Invalid plan' })
  }

  const user = await User.findById(session.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const planData = PLANS[plan]

  try {
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64')

    // Receipt must be ≤ 40 chars
    const shortId = String(user._id).slice(-8)
    const ts = String(Date.now()).slice(-6)
    const receipt = `sb_${plan.slice(0,3)}_${shortId}_${ts}` // e.g. sb_pro_39011_099045 = 22 chars

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount:   planData.price * 100,
        currency: 'INR',
        receipt,
        notes: {
          userId: String(user._id),
          orgId:  user.orgId,
          plan,
          email:  user.email,
        },
      }),
    })

    if (!orderRes.ok) {
      const err = await orderRes.json()
      throw new Error(err.error?.description || 'Razorpay order creation failed')
    }

    const order = await orderRes.json()
    return res.status(200).json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      plan,
      planName: planData.name,
      keyId:    process.env.RAZORPAY_KEY_ID,
      prefill: {
        name:    user.name,
        email:   user.email,
        contact: '',
      },
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}