import { connectDB } from '../../../../lib/mongodb'
import Bill from '../../../../models/Bill'
import OrgConfig from '../../../../models/OrgConfig'
import { requireAuth } from '../../../../lib/auth'
import { generateDocPdf } from '../../../../lib/docPdf'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  const [bill, cfg] = await Promise.all([
    Bill.findOne({ _id: id, orgId }),
    OrgConfig.findOne({ orgId }),
  ])
  if (!bill) return res.status(404).json({ error: 'Bill not found' })

  const buf = await generateDocPdf({
    title: 'BILL',
    number: bill.billNumber,
    status: bill.status,
    dateLabel: 'Bill Date', date: bill.billDate,
    dueLabel: 'Due Date', dueDate: bill.dueDate,
    vendorBillNumber: bill.vendorBillNumber,
    party: bill.vendor, partyLabel: 'Vendor',
    lineItems: bill.lineItems, subtotal: bill.subtotal, taxTotal: bill.taxTotal, total: bill.total,
    cgstTotal: bill.cgstTotal, sgstTotal: bill.sgstTotal, igstTotal: bill.igstTotal, taxType: bill.taxType,
    notes: bill.notes, currency: bill.currency,
  }, cfg ? cfg.toObject() : {})

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${bill.billNumber}.pdf"`)
  res.send(buf)
}
