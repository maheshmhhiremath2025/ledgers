import { connectDB } from '../../../lib/mongodb'
import Account from '../../../models/Account'

const DEFAULT_ACCOUNTS = [
  { code: '1010', name: 'Cash & Cash Equivalents', type: 'Asset', group: 'Current Assets', balance: 0 },
  { code: '1020', name: 'Accounts Receivable', type: 'Asset', group: 'Current Assets', balance: 0 },
  { code: '1030', name: 'Inventory', type: 'Asset', group: 'Current Assets', balance: 0 },
  { code: '1110', name: 'Equipment', type: 'Asset', group: 'Fixed Assets', balance: 0 },
  { code: '2010', name: 'Accounts Payable', type: 'Liability', group: 'Current Liabilities', balance: 0 },
  { code: '2020', name: 'Short-term Loans', type: 'Liability', group: 'Current Liabilities', balance: 0 },
  { code: '3010', name: 'Share Capital', type: 'Equity', group: 'Equity', balance: 0 },
  { code: '3020', name: 'Retained Earnings', type: 'Equity', group: 'Equity', balance: 0 },
  { code: '4010', name: 'Product Revenue', type: 'Income', group: 'Operating Revenue', balance: 0 },
  { code: '4020', name: 'Service Revenue', type: 'Income', group: 'Operating Revenue', balance: 0 },
  { code: '5010', name: 'Cost of Goods Sold', type: 'Expense', group: 'Cost of Revenue', balance: 0 },
  { code: '5020', name: 'Salaries & Wages', type: 'Expense', group: 'Operating Expenses', balance: 0 },
  { code: '5030', name: 'Rent Expense', type: 'Expense', group: 'Operating Expenses', balance: 0 },
  { code: '5040', name: 'Utilities', type: 'Expense', group: 'Operating Expenses', balance: 0 },
  { code: '5050', name: 'Marketing & Advertising', type: 'Expense', group: 'Operating Expenses', balance: 0 },
]

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    try {
      let accounts = await Account.find({ orgId }).sort({ code: 1 })
      // Seed defaults for new orgs
      if (accounts.length === 0) {
        accounts = await Account.insertMany(DEFAULT_ACCOUNTS.map(a => ({ ...a, orgId })))
      }
      return res.status(200).json(accounts)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const account = await Account.create({ ...req.body, orgId })
      return res.status(201).json(account)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...data } = req.body
      const account = await Account.findByIdAndUpdate(id, data, { new: true })
      return res.status(200).json(account)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}
