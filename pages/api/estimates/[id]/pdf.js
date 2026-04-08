import { connectDB } from '../../../../lib/mongodb'
import Estimate from '../../../../models/Estimate'
import OrgConfig from '../../../../models/OrgConfig'
import { requireAuth } from '../../../../lib/auth'
import { generateDocPdf } from '../../../../lib/docPdf'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  const [est, cfg] = await Promise.all([
    Estimate.findOne({ _id: id, orgId }),
    OrgConfig.findOne({ orgId }),
  ])
  if (!est) return res.status(404).json({ error: 'Estimate not found' })

  const buf = await generateDocPdf({
    title: 'ESTIMATE',
    number: est.estimateNumber,
    status: est.status,
    dateLabel: 'Date', date: est.issueDate,
    dueLabel: 'Valid Until', dueDate: est.expiryDate,
    party: est.customer, partyLabel: 'Quote To',
    lineItems: est.lineItems, subtotal: est.subtotal, taxTotal: est.taxTotal, total: est.total,
    cgstTotal: est.cgstTotal, sgstTotal: est.sgstTotal, igstTotal: est.igstTotal, taxType: est.taxType,
    notes: est.notes, terms: est.terms, currency: est.currency,
  }, cfg ? cfg.toObject() : {})

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${est.estimateNumber}.pdf"`)
  res.send(buf)
}
