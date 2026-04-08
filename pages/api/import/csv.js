import { connectDB } from '../../../lib/mongodb'
import { requireAuth } from '../../../lib/auth'
import { parseCSV } from '../../../lib/csv'
import Customer from '../../../models/Customer'
import Vendor from '../../../models/Vendor'
import Product from '../../../models/Product'
import { audit } from '../../../lib/audit'

const MODELS = {
  customers: {
    Model: Customer,
    fields: ['name', 'email', 'phone', 'gstin', 'address'],
    required: ['name'],
  },
  vendors: {
    Model: Vendor,
    fields: ['name', 'email', 'phone', 'gstin', 'address'],
    required: ['name'],
  },
  products: {
    Model: Product,
    fields: ['name', 'sku', 'description', 'rate', 'tax', 'unit', 'hsnCode'],
    required: ['name'],
    numeric: ['rate', 'tax'],
  },
}

// Case-insensitive header mapping
function mapRow(row, fields) {
  const lower = {}
  for (const [k, v] of Object.entries(row)) lower[k.toLowerCase().replace(/[_\s-]+/g, '')] = v
  const out = {}
  for (const f of fields) {
    const key = f.toLowerCase().replace(/[_\s-]+/g, '')
    out[f] = lower[key] ?? ''
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId

  const { type, csv, dryRun } = req.body || {}
  const cfg = MODELS[type]
  if (!cfg) return res.status(400).json({ error: 'Invalid type. Use customers | vendors | products' })
  if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'csv content required' })

  const { headers, rows } = parseCSV(csv)
  if (!headers.length) return res.status(400).json({ error: 'CSV is empty or malformed' })

  const results = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i], cfg.fields)

    // Validate required
    const missing = cfg.required.filter(r => !mapped[r])
    if (missing.length) {
      results.errors.push({ row: i + 2, reason: `Missing required: ${missing.join(', ')}` })
      results.skipped++
      continue
    }

    // Coerce numerics
    if (cfg.numeric) {
      for (const n of cfg.numeric) {
        if (mapped[n] !== '') {
          const v = Number(mapped[n])
          if (Number.isNaN(v)) {
            results.errors.push({ row: i + 2, reason: `${n} is not a number` })
            results.skipped++
            continue
          }
          mapped[n] = v
        } else {
          delete mapped[n]
        }
      }
    }

    // Strip empty strings so we don't overwrite existing data with blanks
    const clean = {}
    for (const [k, v] of Object.entries(mapped)) if (v !== '' && v != null) clean[k] = v
    clean.orgId = orgId

    if (dryRun) {
      results.created++ // treat as would-create
      continue
    }

    try {
      const existing = await cfg.Model.findOne({ orgId, name: { $regex: `^${String(clean.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
      if (existing) {
        // Backfill only blank fields
        const updates = {}
        for (const f of cfg.fields) {
          if (f === 'name') continue
          if ((existing[f] == null || existing[f] === '') && clean[f] != null) updates[f] = clean[f]
        }
        if (Object.keys(updates).length) {
          await cfg.Model.updateOne({ _id: existing._id }, { $set: updates })
          results.updated++
        } else {
          results.skipped++
        }
      } else {
        await cfg.Model.create(clean)
        results.created++
      }
    } catch (e) {
      results.errors.push({ row: i + 2, reason: e.message })
      results.skipped++
    }
  }

  if (!dryRun) {
    audit(req, auth, {
      action: `import.${type}`, entityType: type,
      meta: { total: results.total, created: results.created, updated: results.updated, skipped: results.skipped, errorCount: results.errors.length },
    })
  }

  return res.status(200).json(results)
}
