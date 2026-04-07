import { connectDB } from '../../../lib/mongodb'
import { requireSuperAdmin } from '../../../lib/superadmin'
import User from '../../../models/User'
import OrgConfig from '../../../models/OrgConfig'
import Invoice from '../../../models/Invoice'
import PurchaseOrder from '../../../models/PurchaseOrder'
import Expense from '../../../models/Expense'
import Payment from '../../../models/Payment'
import CreditNote from '../../../models/CreditNote'
import Customer from '../../../models/Customer'
import Vendor from '../../../models/Vendor'
import Product from '../../../models/Product'
import Account from '../../../models/Account'
import JournalEntry from '../../../models/JournalEntry'
import RecurringInvoice from '../../../models/RecurringInvoice'

const MODELS = {
  users: User, config: OrgConfig, invoices: Invoice, pos: PurchaseOrder,
  expenses: Expense, payments: Payment, creditNotes: CreditNote,
  customers: Customer, vendors: Vendor, products: Product, accounts: Account,
  journals: JournalEntry, recurring: RecurringInvoice,
}

export default async function handler(req, res) {
  await connectDB()
  const me = await requireSuperAdmin(req, res)
  if (!me) return

  const { model, id } = req.query
  const Model = MODELS[model]
  if (!Model) return res.status(400).json({ error: 'Unknown model' })
  if (!id)    return res.status(400).json({ error: 'id required' })

  if (req.method === 'DELETE') {
    await Model.findByIdAndDelete(id)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PUT') {
    let updates
    try { updates = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
    catch { return res.status(400).json({ error: 'Invalid JSON' }) }

    // Strip immutable fields
    delete updates._id
    delete updates.__v
    delete updates.createdAt
    delete updates.updatedAt

    const doc = await Model.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ ok: true, doc })
  }

  return res.status(405).end()
}
