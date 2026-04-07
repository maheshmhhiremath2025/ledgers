import { connectDB } from '../../../lib/mongodb'
import Account from '../../../models/Account'
import JournalEntry from '../../../models/JournalEntry'
import { requireAuth } from '../../../lib/auth'

// Profit & Loss = sum of Income accounts - sum of Expense accounts within a date range.
// Built from posted journal entries (not from balances) so date filters work correctly.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const { from, to } = req.query
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), 3, 1) // Apr 1 of FY by default
  const end   = to   ? new Date(to)   : new Date()

  const accounts = await Account.find({ orgId, type: { $in: ['Income', 'Expense'] } })
  const accountsById = Object.fromEntries(accounts.map(a => [String(a._id), a]))

  const entries = await JournalEntry.find({
    orgId,
    status: 'Posted',
    date: { $gte: start, $lte: end },
  }).lean()

  const totals = {} // accountId → { account, debit, credit }
  for (const e of entries) {
    for (const l of e.lines || []) {
      const acc = accountsById[String(l.accountId)]
      if (!acc) continue
      if (!totals[l.accountId]) totals[l.accountId] = { account: acc, debit: 0, credit: 0 }
      totals[l.accountId].debit  += l.debit  || 0
      totals[l.accountId].credit += l.credit || 0
    }
  }

  const income = []
  const expenses = []
  let totalIncome = 0
  let totalExpense = 0

  for (const t of Object.values(totals)) {
    const acc = t.account
    if (acc.type === 'Income') {
      const amount = (t.credit - t.debit) // income is normally credit
      income.push({ code: acc.code, name: acc.name, amount })
      totalIncome += amount
    } else if (acc.type === 'Expense') {
      const amount = (t.debit - t.credit) // expense is normally debit
      expenses.push({ code: acc.code, name: acc.name, amount })
      totalExpense += amount
    }
  }

  income.sort((a, b) => a.code.localeCompare(b.code))
  expenses.sort((a, b) => a.code.localeCompare(b.code))

  return res.status(200).json({
    from: start, to: end,
    income, expenses,
    totalIncome, totalExpense,
    netProfit: totalIncome - totalExpense,
  })
}
