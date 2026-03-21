import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import OrgConfig from '../../../models/OrgConfig'

// Generate a secure token for an invoice
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const { invoiceId } = req.body
  if (!invoiceId) return res.status(400).json({ error: 'invoiceId required' })

  const invoice = await Invoice.findOne({ _id: invoiceId, orgId })
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  // Generate token if not exists
  if (!invoice.paymentToken) {
    invoice.paymentToken = crypto.randomBytes(24).toString('hex')
    await invoice.save()
  }

  // Build baseUrl from request host so it works on Vercel without port numbers
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host  = req.headers['x-forwarded-host'] || req.headers['host'] || ''
  // Strip any port from the host (e.g. localhost:3000 → use env instead)
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1')
  const baseUrl = isLocal
    ? (process.env.NEXT_PUBLIC_APP_URL || `http://${host}`)
    : `${proto}://${host.split(':')[0]}`

  const cfg = await OrgConfig.findOne({ orgId })
  const paymentConfigured = !!(cfg?.razorpayKeyId && cfg?.razorpaySecret)

  return res.status(200).json({
    token: invoice.paymentToken,
    url: `${baseUrl}/pay/${invoice.paymentToken}`,
    paymentConfigured,
  })
}