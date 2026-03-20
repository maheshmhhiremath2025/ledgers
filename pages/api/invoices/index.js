import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import { withPlan, checkLimit } from '../../../lib/plans'

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

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
        const count = await Invoice.countDocuments({ orgId })
        data.invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`
      }
      data.orgId = orgId
      let subtotal = 0, taxTotal = 0
      data.lineItems = (data.lineItems || []).map(item => {
        const amount = (item.qty || 0) * (item.rate || 0)
        const taxAmt = (amount * (item.tax || 0)) / 100
        subtotal += amount
        taxTotal += taxAmt
        return { ...item, amount }
      })
      data.subtotal = subtotal
      data.taxTotal = taxTotal
      data.total = subtotal + taxTotal
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