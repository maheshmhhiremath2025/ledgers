import { connectDB } from '../../../../lib/mongodb'
import Project from '../../../../models/Project'
import TimeEntry from '../../../../models/TimeEntry'
import Invoice from '../../../../models/Invoice'
import OrgConfig from '../../../../models/OrgConfig'
import { requireAuth } from '../../../../lib/auth'
import { nextNumber } from '../../../../lib/sequence'
import { computeWithGst } from '../../../../lib/gst'
import { audit } from '../../../../lib/audit'

// POST /api/projects/[id]/invoice-time
// Body (optional): { taxPct: 18 }
// Groups all unbilled billable time entries for the project, creates one invoice line per entry,
// marks all entries as invoiced, and returns the new invoice.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query
  const taxPct = Number(req.body?.taxPct) || 0

  const project = await Project.findOne({ _id: id, orgId })
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const entries = await TimeEntry.find({ orgId, projectId: project._id, billable: true, invoicedAt: null }).sort({ date: 1 })
  if (entries.length === 0) return res.status(400).json({ error: 'No unbilled time entries to invoice' })

  const lineItems = entries.map(e => ({
    description: `${project.name}: ${e.description || 'Time'} (${new Date(e.date).toISOString().slice(0,10)})`,
    qty: Number(e.hours),
    rate: Number(e.hourlyRate || project.hourlyRate || 0),
    tax: taxPct,
  }))

  const cfg = await OrgConfig.findOne({ orgId }).lean()
  const totals = computeWithGst(lineItems, { supplierGstin: cfg?.gstin, customerGstin: project.customer?.gstin })

  const inv = await Invoice.create({
    orgId,
    invoiceNumber: await nextNumber(orgId, 'invoice', 'INV', 4),
    status: 'Draft',
    customer: {
      name: project.customer?.name || 'Project Customer',
      email: project.customer?.email || '',
      gstin: project.customer?.gstin || '',
    },
    issueDate: new Date(),
    lineItems: totals.items,
    subtotal: totals.subtotal, taxTotal: totals.taxTotal,
    cgstTotal: totals.cgstTotal, sgstTotal: totals.sgstTotal, igstTotal: totals.igstTotal,
    taxType: totals.taxType,
    total: totals.total,
    currency: project.currency || 'INR',
    notes: `Generated from project: ${project.name}`,
    template: 'classic',
  })

  // Mark all entries as invoiced
  await TimeEntry.updateMany(
    { _id: { $in: entries.map(e => e._id) } },
    { $set: { invoicedAt: new Date(), invoiceId: inv._id } }
  )

  audit(req, auth, {
    action: 'project.invoice', entityType: 'Project',
    entityId: project._id, entityRef: project.name, amount: inv.total,
    meta: { invoiceId: inv._id, invoiceNumber: inv.invoiceNumber, hours: entries.reduce((s, e) => s + e.hours, 0) },
  })

  return res.status(201).json({ invoice: inv, entriesCount: entries.length })
}
