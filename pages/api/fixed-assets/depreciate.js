import { connectDB } from '../../../lib/mongodb'
import FixedAsset from '../../../models/FixedAsset'
import Account from '../../../models/Account'
import { postJournalEntry } from '../../../lib/journal'

// POST or GET /api/fixed-assets/depreciate?secret=CRON_SECRET
// Posts one month of depreciation for every active asset whose lastDepreciatedAt
// is more than 27 days old (or null). Idempotent within ~30 day window.
export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  await connectDB()
  const now = new Date()
  const assets = await FixedAsset.find({ status: 'Active' })
  let processed = 0, skipped = 0
  for (const a of assets) {
    try {
      // Skip if already depreciated this month
      if (a.lastDepreciatedAt && (now - new Date(a.lastDepreciatedAt)) < 27 * 24 * 60 * 60 * 1000) {
        skipped++; continue
      }
      // Don't depreciate beyond book value reaching salvage
      const depreciableLeft = (a.cost - a.salvageValue) - a.accumulatedDepreciation
      if (depreciableLeft <= 0.01) { skipped++; continue }
      const dep = Math.min(a.monthlyDepreciation, depreciableLeft)
      a.accumulatedDepreciation = Math.round((a.accumulatedDepreciation + dep) * 100) / 100
      a.bookValue = Math.round((a.cost - a.accumulatedDepreciation) * 100) / 100
      a.lastDepreciatedAt = now
      await a.save()

      // Post journal: DR Depreciation Expense, CR Accumulated Depreciation
      try {
        const [depExp, accDep] = await Promise.all([
          Account.findOne({ orgId: a.orgId, code: '5300' }),  // Depreciation Expense
          Account.findOne({ orgId: a.orgId, code: '1500' }),  // Accumulated Depreciation (contra-asset)
        ])
        if (depExp && accDep) {
          await postJournalEntry(a.orgId, {
            date: now,
            narration: `Depreciation: ${a.name} (${a.assetNumber})`,
            reference: a.assetNumber,
            sourceType: 'FixedAsset',
            sourceId: a._id,
            lines: [
              { accountId: depExp._id, accountCode: depExp.code, accountName: depExp.name, debit: dep, credit: 0,   narration: 'Monthly depreciation' },
              { accountId: accDep._id, accountCode: accDep.code, accountName: accDep.name, debit: 0,   credit: dep, narration: 'Accumulated depreciation' },
            ],
          })
        }
      } catch (je) { console.error('[depreciate] journal error:', je.message) }
      processed++
    } catch (e) { console.error('[depreciate] asset error:', e.message) }
  }
  return res.status(200).json({ processed, skipped, total: assets.length })
}
