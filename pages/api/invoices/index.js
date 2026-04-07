import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import { withPlan, checkLimit } from '../../../lib/plans'
import { requireAuth } from '../../../lib/auth'
import { nextNumber, computeLineTotals } from '../../../lib/sequence'

export default async function handler(req, res) {
  await connectDB()
  const __auth = requireAuth(req, res); if (!__auth) return; const orgId = __auth.orgId

  if (req.method === 'GET') {
    try {
      const { status, search, page = 1, limit = 20 } = req.query
      const query = { orgId }
      if (status) query.status = status
      if (search) query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
      ]
      const skip = (parseInt(page) - 1) * parseInt(limit)
      const [invoices, total] = await Promise.all([
        Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        Invoice.countDocuments(query),
      ])
      return res.status(200).json({ invoices, total, page: parseInt(page), pages: Math.ceil(total / limit) })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    try {
      // Plan check
      const user = await withPlan(req, res)
      if (user) {
        const check = checkLimit(user, 'create_invoice')
        if (!check.allowed) {
          return res.status(403).json({ error: check.reason, upgrade: check.upgrade, limitReached: true })
        }
        // Increment counter and save
        user.invoiceCount = (user.invoiceCount || 0) + 1
        await user.save()
      }

      const data = req.body
      if (!data.invoiceNumber) {
        data.invoiceNumber = await nextNumber(orgId, 'invoice', 'INV', 4)
      }
      data.orgId = orgId
      const totals = computeLineTotals(data.lineItems)
      data.lineItems = totals.items
      data.subtotal  = totals.subtotal
      data.taxTotal  = totals.taxTotal
      data.total     = totals.total
      if (!data.template) data.template = 'classic'

      const invoice = await Invoice.create(data)
      return res.status(201).json(invoice)
    } catch (e) {
      return res.status(400).json({ error: e.message })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}