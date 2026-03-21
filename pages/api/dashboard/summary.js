import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import PurchaseOrder from '../../../models/PurchaseOrder'
import Payment from '../../../models/Payment'
import Account from '../../../models/Account'
import Expense from '../../../models/Expense'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  try {
    const now = new Date()
    // Indian FY: April to March
    const fyStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1)
    const last6Start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [
      invoiceStats, poStats, recentInvoices, recentPayments,
      monthlyRevenue, monthlyPayments, topCustomers, accounts,
      upcomingInvoices, expenseByCategory, monthlyExpenses,
    ] = await Promise.all([
      // Invoice status totals
      Invoice.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' } } }
      ]),
      // PO status totals
      PurchaseOrder.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
      ]),
      // Recent invoices
      Invoice.find({ orgId }).sort({ createdAt: -1 }).limit(6),
      // Recent payments
      Payment.find({ orgId }).sort({ paymentDate: -1 }).limit(5),
      // Monthly revenue (last 6 months from invoice totals)
      Invoice.aggregate([
        { $match: { orgId, status: { $in: ['Sent','Paid','Overdue'] }, issueDate: { $gte: last6Start } } },
        { $group: {
          _id: { year: { $year: '$issueDate' }, month: { $month: '$issueDate' } },
          revenue: { $sum: '$total' },
          count:   { $sum: 1 },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Monthly payments collected (last 6 months)
      Payment.aggregate([
        { $match: { orgId, type: 'Receipt', paymentDate: { $gte: last6Start } } },
        { $group: {
          _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } },
          collected: { $sum: '$amount' },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Top 5 customers by revenue
      Invoice.aggregate([
        { $match: { orgId, status: { $in: ['Sent','Paid','Overdue'] } } },
        { $group: { _id: '$customer.name', total: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]),
      // Account balances for cash position
      Account.find({ orgId, type: { $in: ['Asset','Income','Expense'] } }).select('code name type balance'),
      // Upcoming invoices due in next 14 days (not yet paid)
      Invoice.find({ orgId, status: { $in: ['Sent','Overdue'] }, dueDate: { $lte: new Date(Date.now() + 14*24*60*60*1000) } })
        .sort({ dueDate: 1 }).limit(5),
      // Expenses by category (this FY)
      Expense.aggregate([
        { $match: { orgId, date: { $gte: fyStart } } },
        { $group: { _id: '$category', total: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 6 }
      ]),
      // Monthly expenses (last 6 months)
      Expense.aggregate([
        { $match: { orgId, date: { $gte: last6Start } } },
        { $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          expenses: { $sum: '$total' },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
    ])

    // Build 6-month chart series
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('en-IN', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2) })
    }

    const revenueMap   = {}
    const collectedMap = {}
    const expenseMap   = {}
    monthlyRevenue.forEach(x   => { revenueMap[`${x._id.year}-${x._id.month}`]   = x.revenue })
    monthlyPayments.forEach(x  => { collectedMap[`${x._id.year}-${x._id.month}`] = x.collected })
    monthlyExpenses.forEach(x  => { expenseMap[`${x._id.year}-${x._id.month}`]   = x.expenses })

    const chartData = months.map(m => ({
      label:     m.label,
      revenue:   revenueMap[`${m.year}-${m.month}`]   || 0,
      collected: collectedMap[`${m.year}-${m.month}`] || 0,
      expenses:  expenseMap[`${m.year}-${m.month}`]   || 0,
    }))

    // FY totals
    const fyInvoices = await Invoice.aggregate([
      { $match: { orgId, issueDate: { $gte: fyStart }, status: { $in: ['Sent','Paid','Overdue'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' } } }
    ])

    const cashAcc    = accounts.find(a => a.code === '1010')
    const incomeTotal = accounts.filter(a => a.type === 'Income').reduce((s, a) => s + (a.balance || 0), 0)
    const expTotal    = accounts.filter(a => a.type === 'Expense').reduce((s, a) => s + (a.balance || 0), 0)

    // AR = sum of (total - paidAmount) for all unpaid invoices (Sent + Overdue)
    const arResult = await Invoice.aggregate([
      { $match: { orgId, status: { $in: ['Sent', 'Overdue'] } } },
      { $group: { _id: null, ar: { $sum: { $subtract: ['$total', { $ifNull: ['$paidAmount', 0] }] } } } }
    ])
    const arBalance = arResult[0]?.ar || 0

    const summary = {
      invoices: {
        total:       invoiceStats.reduce((s, x) => s + x.total, 0),
        paid:        invoiceStats.reduce((s, x) => s + x.paid, 0),
        outstanding: invoiceStats.filter(x => ['Sent','Overdue'].includes(x._id)).reduce((s, x) => s + x.total - x.paid, 0),
        overdue:     invoiceStats.find(x => x._id === 'Overdue')?.count || 0,
        count:       invoiceStats.reduce((s, x) => s + x.count, 0),
        byStatus:    Object.fromEntries(invoiceStats.map(x => [x._id, x])),
      },
      purchaseOrders: {
        total:    poStats.reduce((s, x) => s + x.total, 0),
        count:    poStats.reduce((s, x) => s + x.count, 0),
        byStatus: Object.fromEntries(poStats.map(x => [x._id, x])),
      },
      fy: {
        revenue:     fyInvoices[0]?.total || 0,
        collected:   fyInvoices[0]?.paid  || 0,
        netProfit:   incomeTotal - expTotal,
        cashBalance: cashAcc?.balance || 0,
        arBalance,
      },
      chartData,
      topCustomers,
      recentInvoices,
      recentPayments,
      upcomingInvoices,
      expenseByCategory,
    }

    return res.status(200).json(summary)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}