import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import { getSession } from '../../../lib/session'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  // Try cookie session, fallback to userId in body
  let session = getSession(req)
  if (!session && req.body?.userId) {
    session = { userId: req.body.userId }
  }
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
    return res.status(400).json({ error: 'Missing payment details' })
  }

  // Verify Razorpay signature
  const body = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  if (expectedSig !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed — invalid signature' })
  }

  const user = await User.findById(session.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + 1)

  user.plan = plan
  user.planExpiry = expiry
  user.trialEndsAt = null
  user.invoiceCount = 0
  user.poCount = 0
  await user.save()

  return res.status(200).json({
    success: true,
    plan: user.plan,
    planExpiry: user.planExpiry,
    message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated!`,
  })
}