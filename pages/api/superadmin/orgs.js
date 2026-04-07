import { connectDB } from '../../../lib/mongodb'
import User from '../../../models/User'
import OrgConfig from '../../../models/OrgConfig'
import Invoice from '../../../models/Invoice'
import PurchaseOrder from '../../../models/PurchaseOrder'
import Expense from '../../../models/Expense'
import Payment from '../../../models/Payment'
import { requireSuperAdmin } from '../../../lib/superadmin'

export default async function handler(req, res) {
  await connectDB()
  const me = await requireSuperAdmin(req, res)
  if (!me) return
  if (req.method !== 'GET') return res.status(405).end()

  // Every distinct orgId
  const users = await User.find({}).lean()
  const orgMap = {}
  for (const u of users) {
    if (!orgMap[u.orgId]) orgMap[u.orgId] = { orgId: u.orgId, users: [], admin: null }
    orgMap[u.orgId].users.push(u)
    if (u.role === 'admin' && (!orgMap[u.orgId].admin || new Date(u.createdAt) < new Date(orgMap[u.orgId].admin.createdAt))) {
      orgMap[u.orgId].admin = u
    }
  }

  const orgIds = Object.keys(orgMap)
  const [configs, invAgg, poAgg, expAgg, payAgg] = await Promise.all([
    OrgConfig.find({ orgId: { $in: orgIds } }).lean(),
    Invoice.aggregate([{ $match: { orgId: { $in: orgIds } } }, { $group: { _id: '$orgId', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    PurchaseOrder.aggregate([{ $match: { orgId: { $in: orgIds } } }, { $group: { _id: '$orgId', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Expense.aggregate([{ $match: { orgId: { $in: orgIds } } }, { $group: { _id: '$orgId', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { orgId: { $in: orgIds } } }, { $group: { _id: '$orgId', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
  ])

  const cfgMap = Object.fromEntries(configs.map(c => [c.orgId, c]))
  const mapBy = (arr) => Object.fromEntries(arr.map(a => [a._id, a]))
  const invMap = mapBy(invAgg), poMap = mapBy(poAgg), expMap = mapBy(expAgg), payMap = mapBy(payAgg)

  const orgs = Object.values(orgMap).map(o => {
    const cfg = cfgMap[o.orgId]
    return {
      orgId: o.orgId,
      businessName: cfg?.businessName || '—',
      adminName: o.admin?.name || '—',
      adminEmail: o.admin?.email || '—',
      plan: o.admin?.plan || 'starter',
      planExpiry: o.admin?.planExpiry || null,
      createdAt: o.admin?.createdAt || null,
      userCount: o.users.length,
      invoiceCount: invMap[o.orgId]?.count || 0,
      invoiceTotal: invMap[o.orgId]?.total || 0,
      poCount: poMap[o.orgId]?.count || 0,
      poTotal: poMap[o.orgId]?.total || 0,
      expenseCount: expMap[o.orgId]?.count || 0,
      expenseTotal: expMap[o.orgId]?.total || 0,
      paymentCount: payMap[o.orgId]?.count || 0,
      paymentTotal: payMap[o.orgId]?.total || 0,
    }
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  return res.status(200).json({ orgs, totalOrgs: orgs.length, totalUsers: users.length })
}
