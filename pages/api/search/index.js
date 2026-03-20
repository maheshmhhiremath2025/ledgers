import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import Customer from '../../../models/Customer'
import Vendor from '../../../models/Vendor'
import Expense from '../../../models/Expense'
import Payment from '../../../models/Payment'
import PurchaseOrder from '../../../models/PurchaseOrder'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'
  const { q } = req.query
  if (!q || q.length < 2) return res.status(200).json({ results: [] })

  const rx = { $regex: q, $options: 'i' }

  try {
    const [invoices, customers, vendors, expenses, payments, pos] = await Promise.all([
      Invoice.find({ orgId, $or: [{ invoiceNumber: rx }, { 'customer.name': rx }] }).limit(5).select('invoiceNumber customer status total issueDate'),
      Customer.find({ orgId, $or: [{ name: rx }, { email: rx }, { gstin: rx }] }).limit(4).select('name email phone'),
      Vendor.find({ orgId, $or: [{ name: rx }, { email: rx }] }).limit(3).select('name email'),
      Expense.find({ orgId, $or: [{ description: rx }, { category: rx }, { vendor: rx }] }).limit(4).select('description category total date'),
      Payment.find({ orgId, $or: [{ paymentNumber: rx }, { 'party.name': rx } ] }).limit(4).select('paymentNumber party amount paymentDate type'),
      PurchaseOrder.find({ orgId, $or: [{ poNumber: rx }, { 'vendor.name': rx }] }).limit(3).select('poNumber vendor status total'),
    ])

    const results = [
      ...invoices.map(x => ({ type:'invoice',  id:String(x._id), title:x.invoiceNumber, sub:`${x.customer?.name} · ${x.status}`, value:x.total, date:x.issueDate, nav:'invoices' })),
      ...customers.map(x => ({ type:'customer', id:String(x._id), title:x.name, sub:x.email||x.phone||'Customer', nav:'customers' })),
      ...vendors.map(x =>   ({ type:'vendor',   id:String(x._id), title:x.name, sub:x.email||'Vendor', nav:'vendors' })),
      ...pos.map(x =>       ({ type:'po',       id:String(x._id), title:x.poNumber, sub:`${x.vendor?.name} · ${x.status}`, value:x.total, nav:'purchase-orders' })),
      ...payments.map(x =>  ({ type:'payment',  id:String(x._id), title:x.paymentNumber, sub:`${x.party?.name||''} · ${x.type}`, value:x.amount, date:x.paymentDate, nav:'payments' })),
      ...expenses.map(x =>  ({ type:'expense',  id:String(x._id), title:x.description||x.category, sub:`${x.category} · Expense`, value:x.total, date:x.date, nav:'expenses' })),
    ]

    return res.status(200).json({ results })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}