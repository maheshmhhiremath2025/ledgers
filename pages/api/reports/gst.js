import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import OrgConfig from '../../../models/OrgConfig'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const { month, year } = req.query // e.g. month=3&year=2026

  if (!month || !year) return res.status(400).json({ error: 'month and year required' })

  const m = parseInt(month), y = parseInt(year)
  const from = new Date(y, m - 1, 1)
  const to   = new Date(y, m, 1)  // exclusive

  try {
    const [invoices, cfg] = await Promise.all([
      Invoice.find({
        orgId,
        status: { $in: ['Sent', 'Paid', 'Overdue'] },
        issueDate: { $gte: from, $lt: to },
      }).sort({ issueDate: 1 }),
      OrgConfig.findOne({ orgId }),
    ])

    // ── GSTR-1: B2B (invoices with customer GSTIN) ──
    const b2b = invoices
      .filter(inv => inv.customer?.gstin)
      .map(inv => ({
        gstin:         inv.customer.gstin,
        name:          inv.customer.name,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate:   inv.issueDate,
        invoiceValue:  inv.total,
        taxableValue:  inv.subtotal,
        igst:          0,  // simplified — split CGST/SGST/IGST based on whether inter-state
        cgst:          Math.round(inv.taxTotal / 2 * 100) / 100,
        sgst:          Math.round(inv.taxTotal / 2 * 100) / 100,
        rate:          inv.lineItems?.[0]?.tax || 18,
      }))

    // ── GSTR-1: B2C (invoices without customer GSTIN) ──
    const b2c = invoices
      .filter(inv => !inv.customer?.gstin)
      .map(inv => ({
        name:          inv.customer?.name || 'Consumer',
        invoiceNumber: inv.invoiceNumber,
        invoiceDate:   inv.issueDate,
        invoiceValue:  inv.total,
        taxableValue:  inv.subtotal,
        cgst:          Math.round(inv.taxTotal / 2 * 100) / 100,
        sgst:          Math.round(inv.taxTotal / 2 * 100) / 100,
      }))

    // ── HSN/SAC Summary ──
    const hsnMap = {}
    invoices.forEach(inv => {
      (inv.lineItems || []).forEach(item => {
        const sac = cfg?.sacCode || '998300'
        if (!hsnMap[sac]) hsnMap[sac] = { sac, description: 'Services', qty: 0, value: 0, taxableValue: 0, igst: 0, cgst: 0, sgst: 0 }
        const itemValue = (item.qty || 0) * (item.rate || 0)
        const tax = itemValue * (item.tax || 0) / 100
        hsnMap[sac].qty         += item.qty || 0
        hsnMap[sac].value       += itemValue + tax
        hsnMap[sac].taxableValue += itemValue
        hsnMap[sac].cgst        += tax / 2
        hsnMap[sac].sgst        += tax / 2
      })
    })

    // ── GSTR-3B Summary ──
    const totalTaxable = invoices.reduce((s, inv) => s + (inv.subtotal || 0), 0)
    const totalTax     = invoices.reduce((s, inv) => s + (inv.taxTotal  || 0), 0)
    const totalValue   = invoices.reduce((s, inv) => s + (inv.total     || 0), 0)

    // Tax rate breakdown
    const rateBreakdown = {}
    invoices.forEach(inv => {
      (inv.lineItems || []).forEach(item => {
        const rate = item.tax || 0
        if (!rateBreakdown[rate]) rateBreakdown[rate] = { rate, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 }
        const base = (item.qty || 0) * (item.rate || 0)
        const tax  = base * rate / 100
        rateBreakdown[rate].taxableValue += base
        rateBreakdown[rate].cgst += tax / 2
        rateBreakdown[rate].sgst += tax / 2
      })
    })

    return res.status(200).json({
      period: { month: m, year: y, label: new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) },
      org: { gstin: cfg?.gstin, pan: cfg?.pan, businessName: cfg?.businessName, sacCode: cfg?.sacCode },
      summary: {
        totalInvoices: invoices.length,
        b2bCount: b2b.length,
        b2cCount: b2c.length,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalCGST:    Math.round(totalTax / 2 * 100) / 100,
        totalSGST:    Math.round(totalTax / 2 * 100) / 100,
        totalIGST:    0,
        totalTax:     Math.round(totalTax * 100) / 100,
        totalValue:   Math.round(totalValue * 100) / 100,
      },
      gstr1: { b2b, b2c, hsnSummary: Object.values(hsnMap) },
      gstr3b: {
        outwardSupplies: { taxableValue: totalTaxable, cgst: totalTax / 2, sgst: totalTax / 2, igst: 0 },
        rateBreakdown: Object.values(rateBreakdown).sort((a, b) => a.rate - b.rate),
      },
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}