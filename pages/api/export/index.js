import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import Payment from '../../../models/Payment'
import PurchaseOrder from '../../../models/PurchaseOrder'
import Customer from '../../../models/Customer'
import Expense from '../../../models/Expense'
import JournalEntry from '../../../models/JournalEntry'
import Account from '../../../models/Account'

const fmt = n => Number(n || 0).toFixed(2)
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

function toCSV(headers, rows) {
  const escape = v => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const { type } = req.query

  try {
    let csv = '', filename = 'export.csv'

    if (type === 'invoices') {
      const invoices = await Invoice.find({ orgId }).sort({ issueDate: -1 })
      filename = 'invoices.csv'
      csv = toCSV(
        ['Invoice #', 'Status', 'Issue Date', 'Due Date', 'Customer', 'Customer Email', 'Customer GSTIN', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance'],
        invoices.map(inv => [
          inv.invoiceNumber, inv.status,
          fmtDate(inv.issueDate), fmtDate(inv.dueDate),
          inv.customer?.name, inv.customer?.email, inv.customer?.gstin,
          fmt(inv.subtotal), fmt(inv.taxTotal), fmt(inv.total),
          fmt(inv.paidAmount), fmt((inv.total || 0) - (inv.paidAmount || 0)),
        ])
      )
    }

    else if (type === 'payments') {
      const payments = await Payment.find({ orgId }).sort({ paymentDate: -1 })
      filename = 'payments.csv'
      csv = toCSV(
        ['Payment #', 'Type', 'Date', 'Party', 'Party Email', 'Reference', 'Method', 'Amount', 'Notes'],
        payments.map(p => [
          p.paymentNumber, p.type, fmtDate(p.paymentDate),
          p.party?.name, p.party?.email,
          p.referenceNumber || '', p.paymentMode || '',
          fmt(p.amount), p.notes || '',
        ])
      )
    }

    else if (type === 'purchase-orders') {
      const pos = await PurchaseOrder.find({ orgId }).sort({ issueDate: -1 })
      filename = 'purchase_orders.csv'
      csv = toCSV(
        ['PO #', 'Status', 'Issue Date', 'Expected Date', 'Vendor', 'Vendor Email', 'Subtotal', 'Tax', 'Total'],
        pos.map(po => [
          po.poNumber, po.status,
          fmtDate(po.issueDate), fmtDate(po.expectedDate),
          po.vendor?.name, po.vendor?.email,
          fmt(po.subtotal), fmt(po.taxTotal), fmt(po.total),
        ])
      )
    }

    else if (type === 'expenses') {
      const { default: Expense } = await import('../../../models/Expense')
      const expenses = await Expense.find({ orgId }).sort({ date: -1 })
      filename = 'expenses.csv'
      csv = toCSV(
        ['Exp #', 'Date', 'Category', 'Vendor', 'Description', 'Payment Mode', 'Amount', 'Tax %', 'Tax Amount', 'Total', 'Notes'],
        expenses.map(e => [
          e.expenseNumber, fmtDate(e.date), e.category,
          e.vendor || '', e.description || '', e.paymentMode || '',
          fmt(e.amount), e.tax || 0, fmt(e.taxAmount), fmt(e.total), e.notes || '',
        ])
      )
    }

    else if (type === 'customers') {
      const customers = await Customer.find({ orgId }).sort({ name: 1 })
      // Also get invoice stats per customer
      const stats = await Invoice.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$customer.name', total: { $sum: '$total' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } }
      ])
      const statsMap = Object.fromEntries(stats.map(s => [s._id, s]))
      filename = 'customers.csv'
      csv = toCSV(
        ['Name', 'Email', 'Phone', 'Address', 'GSTIN', 'Invoices', 'Total Billed', 'Total Paid', 'Outstanding'],
        customers.map(c => {
          const s = statsMap[c.name] || {}
          return [
            c.name, c.email, c.phone, c.address, c.gstin,
            s.count || 0, fmt(s.total), fmt(s.paid), fmt((s.total || 0) - (s.paid || 0)),
          ]
        })
      )
    }

    else if (type === 'journal') {
      const entries = await JournalEntry.find({ orgId }).sort({ date: -1 }).limit(1000)
      // Flatten multi-line entries
      const rows = []
      entries.forEach(e => {
        e.lines.forEach(line => {
          rows.push([
            e.entryNumber, fmtDate(e.date), e.narration,
            line.accountId, fmt(line.debit), fmt(line.credit),
            e.sourceType || '', e.sourceId || '',
          ])
        })
      })
      filename = 'journal_entries.csv'
      csv = toCSV(['Entry #', 'Date', 'Narration', 'Account ID', 'Debit', 'Credit', 'Source Type', 'Source ID'], rows)
    }

    else if (type === 'ledger') {
      const accounts = await Account.find({ orgId }).sort({ code: 1 })
      filename = 'chart_of_accounts.csv'
      csv = toCSV(
        ['Code', 'Name', 'Type', 'Group', 'Balance'],
        accounts.map(a => [a.code, a.name, a.type, a.group || '', fmt(a.balance)])
      )
    }

    else {
      return res.status(400).json({ error: 'Invalid export type. Use: invoices, payments, purchase-orders, customers, journal, ledger' })
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).send('\uFEFF' + csv) // BOM for Excel UTF-8 compatibility
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}