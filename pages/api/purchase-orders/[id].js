import { connectDB } from '../../../lib/mongodb'
import PurchaseOrder from '../../../models/PurchaseOrder'
import Payment from '../../../models/Payment'
import OrgConfig from '../../../models/OrgConfig'
import { postPaymentMade } from '../../../lib/journal'

async function autoCreatePayment(orgId, po) {
  try {
    const count = await Payment.countDocuments({ orgId })
    const payment = await Payment.create({
      orgId,
      paymentNumber: `PAY-${String(count + 1).padStart(4, '0')}`,
      type: 'Payment',
      paymentDate: new Date(),
      amount: po.total,
      currency: po.currency || 'INR',
      party: { name: po.vendor?.name, email: po.vendor?.email },
      referenceType: 'PurchaseOrder',
      referenceId: po._id,
      referenceNumber: po.poNumber,
      method: 'Other',
      notes: `Auto-recorded: PO ${po.poNumber} marked as Paid`,
    })
    // Post journal: DR AP / CR Cash
    await postPaymentMade(orgId, payment)
    return payment
  } catch (e) {
    console.error('Auto-payment error:', e.message)
    return null
  }
}

// Keep the existing PDF builder
function buildPOHTML(po, cfg) {
  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const statusColor = { Draft:'#888', Sent:'#185FA5', Paid:'#3B6D11', Partial:'#BA7517', Cancelled:'#A32D2D' }
  const biz = cfg?.businessName || 'Synergific'

  const rows = (po.lineItems || []).map((item, i) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:10px 8px;color:#444">${i+1}</td>
      <td style="padding:10px 8px">${item.description}</td>
      <td style="padding:10px 8px;text-align:right">${item.qty}</td>
      <td style="padding:10px 8px;text-align:right">${fmt(item.rate)}</td>
      <td style="padding:10px 8px;text-align:right">${item.tax||0}%</td>
      <td style="padding:10px 8px;text-align:right;font-weight:500">${fmt(item.amount + (item.amount*(item.tax||0)/100))}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#222;background:#fff;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #0F6E56}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    thead{background:#0F6E56;color:#fff}
    thead th{padding:10px 8px;text-align:left;font-size:11px;font-weight:600}
    .totals{margin-left:auto;width:280px}
    .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #eee}
    .totals-final{display:flex;justify-content:space-between;padding:10px 0 0;font-size:16px;font-weight:700;color:#0F6E56}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${statusColor[po.status]||'#888'}22;color:${statusColor[po.status]||'#888'}}
  </style></head><body>
  <div class="header">
    <div><div style="font-size:20px;font-weight:700;color:#0F6E56">${biz}</div></div>
    <div>
      <div style="font-size:28px;font-weight:700;color:#0F6E56;text-align:right">PURCHASE ORDER</div>
      <div style="font-size:12px;color:#666;text-align:right;margin-top:4px">${po.poNumber}</div>
      <div style="text-align:right;margin-top:4px"><span class="badge">${po.status}</span></div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
    <div style="background:#f8f8f8;border-radius:8px;padding:16px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#999;margin-bottom:6px">Vendor</div>
      <div style="font-size:14px;font-weight:600">${po.vendor?.name||''}</div>
      <div style="font-size:12px;color:#666">${po.vendor?.email||''}</div>
      <div style="font-size:12px;color:#666">${po.vendor?.address||''}</div>
    </div>
    <div style="background:#E8F5F1;border-radius:8px;padding:16px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#999;margin-bottom:6px">Order Details</div>
      <div style="font-size:12px;line-height:1.8">
        <b>Issue Date:</b> ${fmtDate(po.issueDate)}<br>
        <b>Expected:</b> ${fmtDate(po.expectedDate)}<br>
        ${po.deliveryAddress?`<b>Deliver To:</b> ${po.deliveryAddress}`:''}
      </div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th style="width:32px">#</th><th>Description</th>
      <th style="text-align:right;width:60px">Qty</th>
      <th style="text-align:right;width:100px">Rate</th>
      <th style="text-align:right;width:60px">Tax</th>
      <th style="text-align:right;width:110px">Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(po.subtotal)}</span></div>
    <div class="totals-row"><span>Tax</span><span>${fmt(po.taxTotal)}</span></div>
    <div class="totals-final"><span>Total</span><span>${fmt(po.total)}</span></div>
  </div>
  ${po.notes?`<div style="margin-top:24px;background:#fffbf0;border-left:3px solid #BA7517;padding:12px 16px;font-size:12px"><b>Notes:</b> ${po.notes}</div>`:''}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;display:flex;justify-content:space-between">
    <span>Generated by ${biz}</span><span>${po.poNumber}</span>
  </div>
</body></html>`
}

export default async function handler(req, res) {
  await connectDB()
  const { method, query: { id } } = req
  const orgId = req.headers['x-org-id'] || req.query.orgId || 'default'

  if (method === 'GET') {
    const po = await PurchaseOrder.findById(id)
    if (!po) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(po)
  }

  if (method === 'PUT') {
    try {
      const prev = await PurchaseOrder.findById(id)
      const data = req.body
      let subtotal = 0, taxTotal = 0
      if (data.lineItems) {
        data.lineItems = data.lineItems.map(item => {
          const amount = (item.qty || 0) * (item.rate || 0)
          const taxAmt = (amount * (item.tax || 0)) / 100
          subtotal += amount; taxTotal += taxAmt
          return { ...item, amount }
        })
        data.subtotal = subtotal; data.taxTotal = taxTotal; data.total = subtotal + taxTotal
      }

      const po = await PurchaseOrder.findByIdAndUpdate(id, data, { new: true })
      if (!po) return res.status(404).json({ error: 'Not found' })

      // Auto-create payment when PO marked Paid (first time)
      const wasPaid = prev?.status !== 'Paid' && po.status === 'Paid'
      if (wasPaid) {
        const existing = await Payment.findOne({ orgId, referenceId: po._id, type: 'Payment' })
        if (!existing) {
          await autoCreatePayment(orgId, po)
        }
      }

      return res.status(200).json(po)
    } catch (e) { return res.status(400).json({ error: e.message }) }
  }

  if (method === 'DELETE') {
    await PurchaseOrder.findByIdAndDelete(id)
    return res.status(200).json({ message: 'Deleted' })
  }

  // PDF
  if (method === 'GET' && req.query.pdf) {
    const po = await PurchaseOrder.findById(id)
    const cfg = await OrgConfig.findOne({ orgId })
    res.setHeader('Content-Type', 'text/html')
    return res.send(buildPOHTML(po, cfg))
  }

  res.status(405).end()
}