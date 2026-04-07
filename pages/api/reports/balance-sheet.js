import { connectDB } from '../../../lib/mongodb'
import Account from '../../../models/Account'
import JournalEntry from '../../../models/JournalEntry'
import { requireAuth } from '../../../lib/auth'

// Balance Sheet at a point in time. Computed from journal entries up to `asOf`.
// Net profit/loss for the period (FY start → asOf) flows into Equity → Retained Earnings.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date()

  const accounts = await Account.find({ orgId })
  const accountsById = Object.fromEntries(accounts.map(a => [String(a._id), a]))

  const entries = await JournalEntry.find({
    orgId, status: 'Posted', date: { $lte: asOf },
  }).lean()

  const sums = {} // accountId → { account, debit, credit }
  for (const e of entries) {
    for (const l of e.lines || []) {
      const acc = accountsById[String(l.accountId)]
      if (!acc) continue
      if (!sums[l.accountId]) sums[l.accountId] = { account: acc, debit: 0, credit: 0 }
      sums[l.accountId].debit  += l.debit  || 0
      sums[l.accountId].credit += l.credit || 0
    }
  }

  const assets      = []
  const liabilities = []
  const equity      = []
  let totalIncome = 0, totalExpense = 0

  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0

  for (const s of Object.values(sums)) {
    const acc = s.account
    if (acc.type === 'Asset') {
      const amount = s.debit - s.credit
      assets.push({ code: acc.code, name: acc.name, amount })
      totalAssets += amount
    } else if (acc.type === 'Liability') {
      const amount = s.credit - s.debit
      liabilities.push({ code: acc.code, name: acc.name, amount })
      totalLiabilities += amount
    } else if (acc.type === 'Equity') {
      const amount = s.credit - s.debit
      equity.push({ code: acc.code, name: acc.name, amount })
      totalEquity += amount
    } else if (acc.type === 'Income') {
      totalIncome += s.credit - s.debit
    } else if (acc.type === 'Expense') {
      totalExpense += s.debit - s.credit
    }
  }

  const retainedEarnings = totalIncome - totalExpense
  if (Math.abs(retainedEarnings) > 0.01) {
    equity.push({ code: '3900', name: 'Retained Earnings (P&L)', amount: retainedEarnings })
    totalEquity += retainedEarnings
  }

  assets.sort((a, b) => a.code.localeCompare(b.code))
  liabilities.sort((a, b) => a.code.localeCompare(b.code))
  equity.sort((a, b) => a.code.localeCompare(b.code))

  return res.status(200).json({
    asOf,
    assets, liabilities, equity,
    totalAssets, totalLiabilities, totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    inBalance: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  })
}
