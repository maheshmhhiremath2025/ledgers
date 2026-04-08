import { connectDB } from '../../../lib/mongodb'
import FixedAsset from '../../../models/FixedAsset'
import { requireAuth } from '../../../lib/auth'
import { nextNumber } from '../../../lib/sequence'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  if (req.method === 'GET') {
    const items = await FixedAsset.find({ orgId }).sort({ purchaseDate: -1 })
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    try {
      const data = { ...req.body, orgId }
      if (!data.name || !data.cost || !data.usefulLifeYears || !data.purchaseDate) {
        return res.status(400).json({ error: 'name, cost, usefulLifeYears, purchaseDate required' })
      }
      data.assetNumber = data.assetNumber || await nextNumber(orgId, 'asset', 'AST', 4)
      const monthly = ((Number(data.cost) || 0) - (Number(data.salvageValue) || 0)) / ((Number(data.usefulLifeYears) || 1) * 12)
      data.monthlyDepreciation = Math.round(monthly * 100) / 100
      data.bookValue = data.cost
      data.accumulatedDepreciation = 0
      const item = await FixedAsset.create(data)
      audit(req, auth, { action: 'asset.create', entityType: 'FixedAsset', entityId: item._id, entityRef: item.assetNumber, amount: item.cost })
      return res.status(201).json(item)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }
  res.status(405).end()
}
