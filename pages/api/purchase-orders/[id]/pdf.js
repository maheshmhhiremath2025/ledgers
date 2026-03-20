import { connectDB } from '../../../../lib/mongodb'
import PurchaseOrder from '../../../../models/PurchaseOrder'
import OrgConfig from '../../../../models/OrgConfig'

function buildPOHTML(po, cfg) {
  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const statusColor = { Draft:'#888', Sent:'#185FA5', Received:'#3B6D11', Partial:'#BA7517', Cancelled:'#A32D2D' }
  const sc = statusColor[po.status] || '#888'

  const bizName    = cfg?.businessName    || 'Synergific'
  const bizEmail   = cfg?.businessEmail   || ''
  const bizPhone   = cfg?.businessPhone   || ''
  const bizAddress = cfg?.businessAddress || ''
  const bizWebsite = cfg?.businessWebsite || ''
  const logoUrl    = cfg?.logoUrl         || ''
  const gstin      = cfg?.gstin           || ''
  const pan        = cfg?.pan             || ''
  const sigName    = cfg?.signatureName   || ''
  const sigTitle   = cfg?.signatureTitle  || ''
  const footerText = cfg?.footerText      || 'This is a computer-generated purchase order.'

  const rows = (po.lineItems || []).map((item, i) => {
    const lineTotal = (item.qty || 0) * (item.rate || 0)
    const taxAmt = lineTotal * (item.tax || 0) / 100
    return `<tr>
      <td class="td tc">${i+1}</td>
      <td class="td">${item.description||''}</td>
      <td class="td tr">${item.qty}</td>
      <td class="td tr">${fmt(item.rate)}</td>
      <td class="td tc">${item.tax||0}%</td>
      <td class="td tr fw">${fmt(lineTotal+taxAmt)}</td>
    </tr>`
  }).join('')

  // Left header: logo if exists, else business name
  const leftHeader = logoUrl
    ? `<div>
        <img src="${logoUrl}" alt="${bizName}" style="max-height:56px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px"/>
        <div style="font-size:11px;color:#666;line-height:1.7">
          ${bizAddress ? bizAddress.replace(/\n/g,'<br>') + '<br>' : ''}
          ${bizEmail}${bizPhone ? ' &nbsp;|&nbsp; '+bizPhone : ''}
          ${bizWebsite ? '<br>'+bizWebsite : ''}
        </div>
        ${gstin ? `<span class="biz-tag" style="background:#E8F5F1;color:#0F6E56">GSTIN: ${gstin}</span>` : ''}
        ${pan   ? `<span class="biz-tag" style="background:#FEF3C7;color:#92400E;margin-left:4px">PAN: ${pan}</span>` : ''}
      </div>`
    : `<div>
        <div class="biz-name">${bizName}</div>
        <div style="font-size:11px;color:#666;line-height:1.7">
          ${bizAddress ? bizAddress.replace(/\n/g,'<br>') + '<br>' : ''}
          ${bizEmail}${bizPhone ? ' &nbsp;|&nbsp; '+bizPhone : ''}
          ${bizWebsite ? '<br>'+bizWebsite : ''}
        </div>
        ${gstin ? `<div style="margin-top:5px"><span class="biz-tag" style="background:#E8F5F1;color:#0F6E56">GSTIN: ${gstin}</span></div>` : ''}
        ${pan   ? `<div style="margin-top:3px"><span class="biz-tag" style="background:#FEF3C7;color:#92400E">PAN: ${pan}</span></div>` : ''}
      </div>`

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>${po.poNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#1a1a1a;background:#fff}
  .page{max-width:794px;margin:0 auto;padding:40px 44px 36px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:2.5px solid #0F6E56}
  .biz-name{font-size:20px;font-weight:700;color:#0F6E56;margin-bottom:5px}
  .biz-tag{display:inline-block;font-size:10px;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:600}
  .po-right{text-align:right;flex-shrink:0;margin-left:20px}
  .po-title{font-size:28px;font-weight:800;color:#0F6E56;letter-spacing:-1px}
  .po-num{font-size:13px;font-weight:600;color:#444;margin-top:3px}
  .status-pill{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;background:${sc}15;color:${sc};border:1px solid ${sc}40;margin-top:5px;text-transform:uppercase}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px}
  .pbox{border-radius:8px;padding:14px 16px}
  .pbox.vendor{background:#F4FAF8;border:1px solid #C5E8D8}
  .pbox.det{background:#F8FAFF;border:1px solid #E2ECF8}
  .plbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:7px}
  .pname{font-size:14px;font-weight:700;color:#111;margin-bottom:3px}
  .pdetail{font-size:11px;color:#666;line-height:1.65}
  .pgstin{display:inline-block;margin-top:4px;font-size:10px;background:#fff;border:1px solid #ddd;padding:2px 7px;border-radius:3px;color:#555;font-family:monospace}
  .mgrid{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11px}
  .mgrid .ml{color:#999}.mgrid .mv{font-weight:600;color:#222}
  .twrap{border:1px solid #C5E8D8;border-radius:8px;overflow:hidden}
  table{width:100%;border-collapse:collapse}
  .th{background:#0F6E56;color:#fff;padding:9px 11px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:left}
  .th.tr{text-align:right}.th.tc{text-align:center}
  .td{padding:9px 11px;border-bottom:1px solid #E8F5F0;font-size:12px;vertical-align:top}
  .tr{text-align:right;font-variant-numeric:tabular-nums}
  .tc{text-align:center}.fw{font-weight:600}
  tr:nth-child(even) td{background:#F4FAF8}
  tr:last-child td{border-bottom:none}
  .tot-wrap{background:#F4FAF8;padding:14px 16px;border-top:1.5px solid #C5E8D8;display:flex;justify-content:flex-end}
  .tot-box{width:260px}
  .trow{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#555;border-bottom:1px dashed #eee}
  .tfinal{display:flex;justify-content:space-between;padding:9px 0 0;margin-top:4px;border-top:2px solid #0F6E56;font-size:15px;font-weight:700;color:#0F6E56}
  .tv{font-variant-numeric:tabular-nums}
  .notes-wrap{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .note-box{padding:11px 13px;border-radius:0 7px 7px 0}
  .note-box.notes{background:#FFFBF0;border-left:3px solid #EF9F27}
  .note-box.terms{background:#F4FAF8;border-left:3px solid #5DCAA5}
  .note-lbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#999;margin-bottom:5px}
  .note-txt{font-size:11px;color:#555;line-height:1.6}
  .sig-wrap{margin-top:18px;display:flex;justify-content:flex-end}
  .sig-box{text-align:center;min-width:180px}
  .sig-line{height:1px;background:#ddd;margin:24px 0 6px}
  .footer{margin-top:18px;padding-top:12px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#bbb}
  .footer-brand{font-weight:700;color:#0F6E56}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:28px 36px}}
</style></head><body>
<div class="page">

  <div class="hdr">
    ${leftHeader}
    <div class="po-right">
      <div class="po-title">PURCHASE ORDER</div>
      <div class="po-num">${po.poNumber}</div>
      <div><span class="status-pill">${po.status}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="pbox vendor">
      <div class="plbl">Vendor</div>
      <div class="pname">${po.vendor?.name||''}</div>
      ${po.vendor?.email   ? `<div class="pdetail">${po.vendor.email}</div>` : ''}
      ${po.vendor?.address ? `<div class="pdetail">${po.vendor.address}</div>` : ''}
      ${po.vendor?.gstin   ? `<div><span class="pgstin">GSTIN: ${po.vendor.gstin}</span></div>` : ''}
    </div>
    <div class="pbox det">
      <div class="plbl">Order Details</div>
      <div class="mgrid">
        <span class="ml">PO Number</span><span class="mv">${po.poNumber}</span>
        <span class="ml">Issue Date</span><span class="mv">${fmtDate(po.issueDate)}</span>
        <span class="ml">Expected</span><span class="mv">${fmtDate(po.expectedDate)}</span>
        ${po.deliveryAddress ? `<span class="ml">Deliver To</span><span class="mv">${po.deliveryAddress}</span>` : ''}
        <span class="ml">Currency</span><span class="mv">${po.currency||'INR'}</span>
      </div>
    </div>
  </div>

  <div class="twrap">
    <table>
      <thead><tr>
        <th class="th tc" style="width:32px">#</th>
        <th class="th">Description</th>
        <th class="th tr" style="width:52px">Qty</th>
        <th class="th tr" style="width:105px">Rate</th>
        <th class="th tc" style="width:56px">Tax</th>
        <th class="th tr" style="width:115px">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tot-wrap">
      <div class="tot-box">
        <div class="trow"><span>Subtotal</span><span class="tv">${fmt(po.subtotal)}</span></div>
        <div class="trow"><span>Tax (GST)</span><span class="tv">${fmt(po.taxTotal)}</span></div>
        <div class="tfinal"><span>Total</span><span class="tv">${fmt(po.total)}</span></div>
      </div>
    </div>
  </div>

  ${po.notes || po.terms ? `
  <div class="notes-wrap">
    ${po.notes ? `<div class="note-box notes"><div class="note-lbl">Notes</div><div class="note-txt">${po.notes}</div></div>` : '<div></div>'}
    ${po.terms ? `<div class="note-box terms"><div class="note-lbl">Terms &amp; Conditions</div><div class="note-txt">${po.terms}</div></div>` : ''}
  </div>` : ''}

  ${sigName ? `
  <div class="sig-wrap">
    <div class="sig-box">
      <div style="font-size:10px;color:#999">For ${bizName}</div>
      <div class="sig-line"></div>
      <div style="font-size:12px;font-weight:700;color:#222">${sigName}</div>
      ${sigTitle ? `<div style="font-size:11px;color:#666">${sigTitle}</div>` : ''}
      <div style="font-size:10px;color:#999;margin-top:2px">Authorized Signatory</div>
    </div>
  </div>` : ''}

  <div class="footer">
    <span>${footerText}</span>
    <span><span class="footer-brand">${bizName}</span> &middot; ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
  </div>

</div>
<script>if(window.location.search.includes('print=1')){ window.onload=()=>window.print() }</script>
</body></html>`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    await connectDB()
    const orgId = req.headers['x-org-id'] || req.query.orgId || 'default'
    const [po, config] = await Promise.all([
      PurchaseOrder.findById(req.query.id),
      OrgConfig.findOne({ orgId }),
    ])
    if (!po) return res.status(404).json({ error: 'Not found' })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(buildPOHTML(po, config))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}