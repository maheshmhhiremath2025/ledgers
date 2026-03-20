import { connectDB } from '../../../lib/mongodb'
import Expense from '../../../models/Expense'
import { postJournalEntry } from '../../../lib/journal'

export const EXPENSE_CATEGORIES = [
  'Rent & Office',
  'Salaries & Wages',
  'Travel & Transport',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Utilities',
  'Professional Fees',
  'Equipment & Hardware',
  'Meals & Entertainment',
  'Bank Charges',
  'Taxes & Compliance',
  'Repairs & Maintenance',
  'Insurance',
  'Miscellaneous',
]

// Account codes for expense categories (maps to Chart of Accounts)
const CATEGORY_ACCOUNT = {
  'Rent & Office':             '5010',
  'Salaries & Wages':          '5020',
  'Travel & Transport':        '5030',
  'Software & Subscriptions':  '5040',
  'Marketing & Advertising':   '5050',
  'Utilities':                 '5060',
  'Professional Fees':         '5070',
  'Equipment & Hardware':      '5080',
  'Meals & Entertainment':     '5090',
  'Bank Charges':              '5100',
  'Taxes & Compliance':        '5110',
  'Repairs & Maintenance':     '5120',
  'Insurance':                 '5130',
  'Miscellaneous':             '5140',
}

export default async function handler(req, res) {
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  if (req.method === 'GET') {
    try {
      const { search, category, from, to, limit = 100 } = req.query
      const query = { orgId }
      if (search) query.$or = [
        { vendor:      { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category:    { $regex: search, $options: 'i' } },
      ]
      if (category) query.category = category
      if (from || to) {
        query.date = {}
        if (from) query.date.$gte = new Date(from)
        if (to)   query.date.$lte = new Date(to)
      }
      const expenses = await Expense.find(query).sort({ date: -1 }).limit(parseInt(limit))
      const total    = await Expense.countDocuments({ orgId })
      const totalAmount = await Expense.aggregate([
        { $match: { orgId } },
        { $group: { _id: null, sum: { $sum: '$total' } } }
      ])

      // Monthly breakdown
      const monthly = await Expense.aggregate([
        { $match: { orgId } },
        { $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          amount: { $sum: '$total' },
          count:  { $sum: 1 },
        }},
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 },
      ])

      // By category
      const byCategory = await Expense.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$category', total: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ])

      return res.status(200).json({
        expenses, total,
        totalAmount: totalAmount[0]?.sum || 0,
        monthly, byCategory,
      })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const data    = req.body
      const taxAmt  = Math.round((data.amount || 0) * (data.tax || 0) / 100 * 100) / 100
      const total   = (data.amount || 0) + taxAmt
      const count   = await Expense.countDocuments({ orgId })
      const expense = await Expense.create({
        ...data, orgId, taxAmount: taxAmt, total,
        expenseNumber: `EXP-${String(count + 1).padStart(4, '0')}`,
      })

      // Auto-post journal: DR Expense Account / CR Cash
      try {
        const { connectDB } = await import('../../../lib/mongodb')
        const Account = (await import('../../../models/Account')).default
        await connectDB()
        const accCode  = CATEGORY_ACCOUNT[data.category] || '5140'
        const expAcc   = await Account.findOne({ orgId, code: accCode })
        const cashAcc  = await Account.findOne({ orgId, code: '1010' })
        if (expAcc && cashAcc) {
          await postJournalEntry(orgId, {
            date: new Date(data.date),
            narration: `${data.category} — ${data.vendor || data.description || 'Expense'}`,
            sourceType: 'Expense',
            sourceId: expense._id,
            lines: [
              { accountId: expAcc._id, debit: total, credit: 0 },
              { accountId: cashAcc._id, debit: 0, credit: total },
            ],
          })
        }
      } catch (je) { console.error('Expense journal error:', je.message) }

      return res.status(201).json(expense)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  res.status(405).end()
}