import { connectDB } from '../../../lib/mongodb'
import Payment from '../../../models/Payment'
import { requireAuth } from '../../../lib/auth'

// Cash Flow (simplified — direct method): cash in (receipts) and cash out (payments) over a period.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const { from, to } = req.query
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), 3, 1)
  const end   = to   ? new Date(to)   : new Date()

  const pays = await Payment.find({
    orgId,
    paymentDate: { $gte: start, $lte: end },
  }).lean()

  let cashIn = 0, cashOut = 0
  const inflow  = [] // grouped by mode
  const outflow = []
  const byMode = { in: {}, out: {} }

  for (const p of pays) {
    const amt = p.amount || 0
    if (p.type === 'Receipt') {
      cashIn += amt
      byMode.in[p.paymentMode || 'Other'] = (byMode.in[p.paymentMode || 'Other'] || 0) + amt
    } else {
      cashOut += amt
      byMode.out[p.paymentMode || 'Other'] = (byMode.out[p.paymentMode || 'Other'] || 0) + amt
    }
  }
  for (const [mode, amount] of Object.entries(byMode.in))  inflow.push({ mode, amount })
  for (const [mode, amount] of Object.entries(byMode.out)) outflow.push({ mode, amount })

  return res.status(200).json({
    from: start, to: end,
    inflow, outflow,
    cashIn, cashOut,
    netCashFlow: cashIn - cashOut,
  })
}
