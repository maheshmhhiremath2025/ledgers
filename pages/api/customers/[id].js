import { connectDB } from '../../../lib/mongodb'
import Customer from '../../../models/Customer'
import Invoice from '../../../models/Invoice'

export default async function handler(req, res) {
  await connectDB()
  const { id } = req.query
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    const customer = await Customer.findOne({ _id: id, orgId })
    if (!customer) return res.status(404).json({ error: 'Not found' })
    // Get all invoices for this customer
    const invoices = await Invoice.find({ orgId, 'customer.name': customer.name }).sort({ issueDate: -1 })
    const totalBilled  = invoices.reduce((s, i) => s + (i.total     || 0), 0)
    const totalPaid    = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)
    return res.status(200).json({ customer, invoices, totalBilled, totalPaid, outstanding: totalBilled - totalPaid })
  }

  if (req.method === 'PUT') {
    try {
      const data = req.body
      if (data.gstin) data.gstin = data.gstin.toUpperCase()
      const customer = await Customer.findOneAndUpdate({ _id: id, orgId }, data, { new: true })
      if (!customer) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(customer)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    await Customer.findOneAndDelete({ _id: id, orgId })
    return res.status(200).json({ message: 'Deleted' })
  }

  res.status(405).end()
}