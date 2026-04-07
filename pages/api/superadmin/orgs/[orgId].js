import { connectDB } from '../../../../lib/mongodb'
import User from '../../../../models/User'
import OrgConfig from '../../../../models/OrgConfig'
import Invoice from '../../../../models/Invoice'
import PurchaseOrder from '../../../../models/PurchaseOrder'
import Expense from '../../../../models/Expense'
import Payment from '../../../../models/Payment'
import CreditNote from '../../../../models/CreditNote'
import Customer from '../../../../models/Customer'
import Vendor from '../../../../models/Vendor'
import Product from '../../../../models/Product'
import Account from '../../../../models/Account'
import JournalEntry from '../../../../models/JournalEntry'
import RecurringInvoice from '../../../../models/RecurringInvoice'
import { requireSuperAdmin } from '../../../../lib/superadmin'

export default async function handler(req, res) {
  await connectDB()
  const me = await requireSuperAdmin(req, res)
  if (!me) return
  if (req.method !== 'GET') return res.status(405).end()

  const { orgId } = req.query

  const [config, users, invoices, pos, expenses, payments, creditNotes, customers, vendors, products, accounts, journals, recurring] = await Promise.all([
    OrgConfig.findOne({ orgId }).lean(),
    User.find({ orgId }).select('-passwordHash').lean(),
    Invoice.find({ orgId }).sort({ createdAt: -1 }).lean(),
    PurchaseOrder.find({ orgId }).sort({ createdAt: -1 }).lean(),
    Expense.find({ orgId }).sort({ createdAt: -1 }).lean(),
    Payment.find({ orgId }).sort({ createdAt: -1 }).lean(),
    CreditNote.find({ orgId }).sort({ createdAt: -1 }).lean(),
    Customer.find({ orgId }).lean(),
    Vendor.find({ orgId }).lean(),
    Product.find({ orgId }).lean(),
    Account.find({ orgId }).lean(),
    JournalEntry.find({ orgId }).sort({ createdAt: -1 }).limit(500).lean(),
    RecurringInvoice.find({ orgId }).lean(),
  ])

  return res.status(200).json({
    orgId, config, users, invoices, pos, expenses, payments, creditNotes,
    customers, vendors, products, accounts, journals, recurring,
  })
}
