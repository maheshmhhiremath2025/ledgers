import crypto from 'crypto'
import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return res.status(200).json({
    token: invoice.paymentToken,
    url: `${baseUrl}/pay/${invoice.paymentToken}`,
  })
}