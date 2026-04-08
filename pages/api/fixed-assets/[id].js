import { connectDB } from '../../../lib/mongodb'
import FixedAsset from '../../../models/FixedAsset'
import { requireAuth } from '../../../lib/auth'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  if (req.method === 'GET') {
    const a = await FixedAsset.findOne({ _id: id, orgId })
    if (!a) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(a)
  }
  if (req.method === 'PUT') {
    const data = { ...req.body }
    if (data.cost && data.usefulLifeYears) {
      data.monthlyDepreciation = Math.round((((Number(data.cost) - (Number(data.salvageValue) || 0)) / (Number(data.usefulLifeYears) * 12)) * 100)) / 100
    }
    const a = await FixedAsset.findOneAndUpdate({ _id: id, orgId }, data, { new: true })
    if (!a) return res.status(404).json({ error: 'Not found' })
    audit(req, auth, { action: 'asset.update', entityType: 'FixedAsset', entityId: id, entityRef: a.assetNumber })
    return res.status(200).json(a)
  }
  if (req.method === 'DELETE') {
    const a = await FixedAsset.findOneAndDelete({ _id: id, orgId })
    if (!a) return res.status(404).json({ error: 'Not found' })
    audit(req, auth, { action: 'asset.delete', entityType: 'FixedAsset', entityId: id, entityRef: a.assetNumber })
    return res.status(200).json({ ok: true })
  }
  res.status(405).end()
}
