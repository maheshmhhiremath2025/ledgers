import { connectDB } from '../../../lib/mongodb'
import Estimate from '../../../models/Estimate'
import { requireAuth } from '../../../lib/auth'
import { computeLineTotals } from '../../../lib/sequence'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'GET') {
    const est = await Estimate.findOne({ _id: id, orgId })
    if (!est) return res.status(404).json({ error: 'Estimate not found' })
    return res.status(200).json(est)
  }

  if (req.method === 'PUT') {
    try {
      const data = req.body
      const totals = computeLineTotals(data.lineItems)
      data.lineItems = totals.items
      data.subtotal  = totals.subtotal
      data.taxTotal  = totals.taxTotal
      data.total     = totals.total
      const est = await Estimate.findOneAndUpdate({ _id: id, orgId }, data, { new: true })
      if (!est) return res.status(404).json({ error: 'Estimate not found' })
      audit(req, auth, { action: 'estimate.update', entityType: 'Estimate', entityId: est._id, entityRef: est.estimateNumber, amount: est.total })
      return res.status(200).json(est)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    const est = await Estimate.findOneAndDelete({ _id: id, orgId })
    if (!est) return res.status(404).json({ error: 'Estimate not found' })
    audit(req, auth, { action: 'estimate.delete', entityType: 'Estimate', entityId: est._id, entityRef: est.estimateNumber, before: est.toObject() })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
