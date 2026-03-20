import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import Payment from '../../../models/Payment'
import Account from '../../../models/Account'
import JournalEntry from '../../../models/JournalEntry'
import OrgConfig from '../../../models/OrgConfig'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const { type = 'pl', from, to } = req.query

  // Default: current FY
  const now = new Date()
  const fyStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1)
  const fyEnd   = new Date(fyStart.getFullYear() + 1, 2, 31)

  const dateFrom = from ? new Date(from) : fyStart
  const dateTo   = to   ? new Date(to)   : fyEnd

  try {
    const [accounts, cfg] = await Promise.all([
      Account.find({ orgId }).sort({ code: 1 }),
      OrgConfig.findOne({ orgId }),
    ])

    const fyLabel = `FY ${fyStart.getFullYear()}–${String(fyStart.getFullYear() + 1).slice(2)}`

    if (type === 'pl') {
      // ── Profit & Loss ──
      const income   = accounts.filter(a => a.type === 'Income')
      const expenses = accounts.filter(a => a.type === 'Expense')
      const totalIncome   = income.reduce((s, a) => s + (a.balance || 0), 0)
      const totalExpenses = expenses.reduce((s, a) => s + (a.balance || 0), 0)
      const netProfit = totalIncome - totalExpenses

      // Monthly breakdown for chart
      const monthlyData = []
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(fyStart.getFullYear(), fyStart.getMonth() + i, 1)
        const mEnd   = new Date(fyStart.getFullYear(), fyStart.getMonth() + i + 1, 1)
        if (mStart > now) break
        const [mInvoices, mPayments] = await Promise.all([
          Invoice.aggregate([
            { $match: { orgId, status: { $in: ['Sent','Paid','Overdue'] }, issueDate: { $gte: mStart, $lt: mEnd } } },
            { $group: { _id: null, revenue: { $sum: '$total' } } },
          ]),
          Payment.aggregate([
            { $match: { orgId, type: 'Payment', paymentDate: { $gte: mStart, $lt: mEnd } } },
            { $group: { _id: null, expenses: { $sum: '$amount' } } },
          ]),
        ])
        monthlyData.push({
          label: mStart.toLocaleString('en-IN', { month: 'short' }) + " '" + String(mStart.getFullYear()).slice(2),
          revenue:  mInvoices[0]?.revenue  || 0,
          expenses: mPayments[0]?.expenses || 0,
        })
      }

      return res.status(200).json({
        type: 'pl', period: fyLabel,
        org: { businessName: cfg?.businessName, gstin: cfg?.gstin },
        income:   income.map(a => ({ code: a.code, name: a.name, group: a.group, balance: a.balance || 0 })),
        expenses: expenses.map(a => ({ code: a.code, name: a.name, group: a.group, balance: a.balance || 0 })),
        summary: { totalIncome, totalExpenses, netProfit, grossMargin: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0 },
        monthlyData,
      })
    }

    if (type === 'bs') {
      // ── Balance Sheet ──
      const assets      = accounts.filter(a => a.type === 'Asset')
      const liabilities = accounts.filter(a => a.type === 'Liability')
      const equity      = accounts.filter(a => a.type === 'Equity')
      const income      = accounts.filter(a => a.type === 'Income')
      const expenses2   = accounts.filter(a => a.type === 'Expense')

      const totalAssets      = assets.reduce((s, a) => s + (a.balance || 0), 0)
      const totalLiabilities = liabilities.reduce((s, a) => s + (a.balance || 0), 0)
      const totalEquity      = equity.reduce((s, a) => s + (a.balance || 0), 0)
      const retainedEarnings = income.reduce((s, a) => s + (a.balance || 0), 0) - expenses2.reduce((s, a) => s + (a.balance || 0), 0)

      return res.status(200).json({
        type: 'bs', period: `As at ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        org: { businessName: cfg?.businessName, gstin: cfg?.gstin },
        assets:      assets.map(a => ({ code: a.code, name: a.name, group: a.group, balance: a.balance || 0 })),
        liabilities: liabilities.map(a => ({ code: a.code, name: a.name, group: a.group, balance: a.balance || 0 })),
        equity:      equity.map(a => ({ code: a.code, name: a.name, group: a.group, balance: a.balance || 0 })),
        summary: { totalAssets, totalLiabilities, totalEquity, retainedEarnings, totalEquityPlusLiabilities: totalLiabilities + totalEquity + retainedEarnings },
      })
    }

    if (type === 'tb') {
      // ── Trial Balance ──
      const allAccounts = accounts.filter(a => (a.balance || 0) !== 0)
      const totalDebits  = allAccounts.filter(a => ['Asset','Expense'].includes(a.type)).reduce((s, a) => s + (a.balance || 0), 0)
      const totalCredits = allAccounts.filter(a => ['Liability','Equity','Income'].includes(a.type)).reduce((s, a) => s + (a.balance || 0), 0)

      return res.status(200).json({
        type: 'tb', period: fyLabel,
        org: { businessName: cfg?.businessName },
        accounts: allAccounts.map(a => ({
          code: a.code, name: a.name, type: a.type, group: a.group,
          debit:  ['Asset','Expense'].includes(a.type)             ? a.balance || 0 : 0,
          credit: ['Liability','Equity','Income'].includes(a.type) ? a.balance || 0 : 0,
        })),
        summary: { totalDebits, totalCredits, isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 },
      })
    }

    return res.status(400).json({ error: 'Invalid report type. Use: pl, bs, tb' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}