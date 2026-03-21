import { connectDB } from '../../../../lib/mongodb'
import Invoice from '../../../../models/Invoice'
import OrgConfig from '../../../../models/OrgConfig'

const TEMPLATES = {
  classic: {
    primary: '#185FA5', primaryDark: '#0C447C', primaryLight: '#E6F1FB',
    accent: '#0F6E56', headerBg: '#185FA5', headerText: '#fff',
    tableHead: '#185FA5', tableHeadText: '#fff',
    billBg: '#F8FAFF', billBorder: '#E2ECF8',
    detBg: '#F0F9F5', detBorder: '#C5E8D8',
    totBg: '#F8FAFF', totBorder: '#E2ECF8',
    totalColor: '#185FA5', totalBorder: '#185FA5',
    notesBg: '#FFFBF0', notesBorder: '#EF9F27',
    termsBg: '#F4FAF8', termsBorder: '#5DCAA5',
    footerColor: '#185FA5',
  },
  minimal: {
    primary: '#1a1a1a', primaryDark: '#000', primaryLight: '#f5f5f5',
    accent: '#555', headerBg: 'transparent', headerText: '#1a1a1a',
    tableHead: '#1a1a1a', tableHeadText: '#fff',
    billBg: '#fafafa', billBorder: '#e5e5e5',
    detBg: '#fafafa', detBorder: '#e5e5e5',
    totBg: '#fafafa', totBorder: '#e5e5e5',
    totalColor: '#1a1a1a', totalBorder: '#1a1a1a',
    notesBg: '#fafafa', notesBorder: '#ccc',
    termsBg: '#fafafa', termsBorder: '#ccc',
    footerColor: '#555',
    borderStyle: '2px solid #1a1a1a',
  },
  modern: {
    primary: '#0F6E56', primaryDark: '#085041', primaryLight: '#E1F5EE',
    accent: '#14B8A6', headerBg: '#0F6E56', headerText: '#fff',
    tableHead: '#0F6E56', tableHeadText: '#fff',
    billBg: '#F4FAF8', billBorder: '#C5E8D8',
    detBg: '#F0FEFF', detBorder: '#99E6DC',
    totBg: '#F4FAF8', totBorder: '#C5E8D8',
    totalColor: '#0F6E56', totalBorder: '#0F6E56',
    notesBg: '#FFFBF0', notesBorder: '#EF9F27',
    termsBg: '#F4FAF8', termsBorder: '#0F6E56',
    footerColor: '#0F6E56',
  },
  bold: {
    primary: '#fff', primaryDark: '#eee', primaryLight: '#1E2140',
    accent: '#818CF8', headerBg: '#1E2140', headerText: '#fff',
    tableHead: '#252848', tableHeadText: '#A5B4FC',
    billBg: '#1E2140', billBorder: '#3A3E5C',
    detBg: '#191C35', detBorder: '#3A3E5C',
    totBg: '#191C35', totBorder: '#3A3E5C',
    totalColor: '#818CF8', totalBorder: '#6366F1',
    notesBg: '#1E2140', notesBorder: '#F59E0B',
    termsBg: '#1E2140', termsBorder: '#10B981',
    footerColor: '#818CF8',
    dark: true,
  },
  professional: {
    primary: '#6366F1', primaryDark: '#4F46E5', primaryLight: '#EEF2FF',
    accent: '#8B5CF6', headerBg: '#6366F1', headerText: '#fff',
    tableHead: '#6366F1', tableHeadText: '#fff',
    billBg: '#F5F3FF', billBorder: '#DDD6FE',
    detBg: '#EEF2FF', detBorder: '#C7D2FE',
    totBg: '#F5F3FF', totBorder: '#DDD6FE',
    totalColor: '#6366F1', totalBorder: '#6366F1',
    notesBg: '#FFFBF0', notesBorder: '#F59E0B',
    termsBg: '#F5F3FF', termsBorder: '#8B5CF6',
    footerColor: '#6366F1',
  },
}

function buildHTML(inv, cfg, t) {
  const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const statusColor = { Draft:'#888', Due:'#BA7517', Sent:'#185FA5', Paid:'#3B6D11', Overdue:'#A32D2D', Cancelled:'#888' }
  const sc = statusColor[inv.status] || '#888'
  const dueBalance = (inv.total||0) - (inv.paidAmount||0)
  const dark = t.dark || false

  const biz = cfg?.businessName || 'Synergific'
  const logoUrl = cfg?.logoUrl || ''
  const bodyColor   = dark ? '#ECEEF8' : '#1a1a1a'
  const mutedColor  = dark ? '#9EA3BF' : '#666'
  const faintColor  = dark ? '#636880' : '#999'
  const bodyBg      = dark ? '#0D0F1A' : '#fff'

  const rows = (inv.lineItems||[]).map((item,i) => {
    const lt = (item.qty||0)*(item.rate||0), ta = lt*(item.tax||0)/100
    const rowBg = dark ? (i%2===0 ? '#1E2140' : '#252848') : (i%2===0 ? '#fff' : t.billBg)
    return `<tr style="background:${rowBg}">
      <td class="td tc" style="color:${bodyColor}">${i+1}</td>
      <td class="td" style="color:${bodyColor}">${item.description||''}</td>
      <td class="td tr" style="color:${bodyColor}">${item.qty}</td>
      <td class="td tr" style="color:${bodyColor}">${fmt(item.rate)}</td>
      <td class="td tc" style="color:${bodyColor}">${item.tax||0}%</td>
      <td class="td tr fw" style="color:${bodyColor}">${fmt(lt+ta)}</td>
    </tr>`
  }).join('')

  const leftHeader = logoUrl
    ? `<div>
        <img src="${logoUrl}" alt="${biz}" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin-bottom:5px"/>
        <div style="font-size:11px;color:${mutedColor};line-height:1.7">
          ${cfg?.businessAddress ? cfg.businessAddress.replace(/\n/g,'<br>')+'<br>' : ''}
          ${cfg?.businessEmail||''}${cfg?.businessPhone?' &nbsp;|&nbsp; '+cfg.businessPhone:''}
        </div>
        ${cfg?.gstin ? `<span class="tag" style="background:${t.primaryLight};color:${t.primary}">GSTIN: ${cfg.gstin}</span>` : ''}
        ${cfg?.pan   ? `<span class="tag" style="background:#FEF3C7;color:#92400E;margin-left:4px">PAN: ${cfg.pan}</span>` : ''}
      </div>`
    : `<div>
        <div style="font-size:20px;font-weight:700;color:${t.primary};margin-bottom:4px">${biz}</div>
        <div style="font-size:11px;color:${mutedColor};line-height:1.7">
          ${cfg?.businessAddress ? cfg.businessAddress.replace(/\n/g,'<br>')+'<br>' : ''}
          ${cfg?.businessEmail||''}${cfg?.businessPhone?' &nbsp;|&nbsp; '+cfg.businessPhone:''}
          ${cfg?.businessWebsite ? '<br>'+cfg.businessWebsite : ''}
        </div>
        ${cfg?.gstin ? `<div style="margin-top:5px"><span class="tag" style="background:${t.primaryLight};color:${t.primary}">GSTIN: ${cfg.gstin}</span></div>` : ''}
        ${cfg?.pan   ? `<div style="margin-top:3px"><span class="tag" style="background:#FEF3C7;color:#92400E">PAN: ${cfg.pan}</span></div>` : ''}
      </div>`

  const hasBankDetails = cfg?.bankName || cfg?.accountNumber || cfg?.ifscCode

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${inv.invoiceNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${bodyColor};background:${bodyBg}}
  .page{max-width:794px;margin:0 auto;padding:40px 44px 36px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:${t.borderStyle||`2.5px solid ${t.primary}`}}
  .tag{display:inline-block;font-size:10px;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:600}
  .inv-right{text-align:right;flex-shrink:0;margin-left:20px}
  .inv-title{font-size:28px;font-weight:800;color:${t.primary};letter-spacing:-1px}
  .status-pill{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;background:${sc}18;color:${sc};border:1px solid ${sc}40;margin-top:5px;text-transform:uppercase}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px}
  .pbox{border-radius:8px;padding:14px 16px}
  .plbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${faintColor};margin-bottom:7px}
  .pname{font-size:14px;font-weight:700;color:${bodyColor};margin-bottom:3px}
  .pdetail{font-size:11px;color:${mutedColor};line-height:1.65}
  .pgstin{display:inline-block;margin-top:4px;font-size:10px;background:${dark?'rgba(255,255,255,0.08)':'#fff'};border:1px solid ${dark?'rgba(255,255,255,0.12)':'#ddd'};padding:2px 7px;border-radius:3px;color:${mutedColor};font-family:monospace}
  .mgrid{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11px}
  .mgrid .ml{color:${faintColor}}.mgrid .mv{font-weight:600;color:${bodyColor}}
  .twrap{border:1px solid ${dark?'rgba(255,255,255,0.1)':t.billBorder};border-radius:8px;overflow:hidden}
  table{width:100%;border-collapse:collapse}
  .th{background:${t.tableHead};color:${t.tableHeadText};padding:9px 11px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:left}
  .th.tr{text-align:right}.th.tc{text-align:center}
  .td{padding:9px 11px;border-bottom:1px solid ${dark?'rgba(255,255,255,0.06)':t.billBorder};font-size:12px;vertical-align:top;color:${bodyColor}}
  .tr{text-align:right;font-variant-numeric:tabular-nums}.tc{text-align:center}.fw{font-weight:600}
  tr:nth-child(even) td{background:${dark?'rgba(255,255,255,0.02)':t.billBg}}
  tr:last-child td{border-bottom:none}
  .tot-wrap{background:${t.totBg};padding:14px 16px;border-top:1.5px solid ${t.totBorder};display:flex;justify-content:flex-end}
  .tot-box{width:260px}
  .trow{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:${mutedColor};border-bottom:1px dashed ${dark?'rgba(255,255,255,0.1)':'#eee'}}
  .trow.paid .tv{color:#3B6D11;font-weight:600}
  .tfinal{display:flex;justify-content:space-between;padding:9px 0 0;margin-top:4px;border-top:2px solid ${t.totalBorder};font-size:15px;font-weight:700;color:${t.totalColor}}
  .tv{font-variant-numeric:tabular-nums}
  .bank-wrap{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .bank-box{background:${t.detBg};border:1px solid ${t.detBorder};border-radius:8px;padding:13px 15px}
  .bank-lbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${t.primary};margin-bottom:8px}
  .bank-grid{display:grid;grid-template-columns:90px 1fr;gap:2px 8px;font-size:11px}
  .bank-grid .bl{color:${mutedColor}}.bank-grid .bv{font-weight:600;color:${bodyColor}}
  .mono{font-family:monospace}
  .notes-wrap{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .note-box{padding:11px 13px;border-radius:0 7px 7px 0}
  .note-lbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${faintColor};margin-bottom:5px}
  .note-txt{font-size:11px;color:${mutedColor};line-height:1.6}
  .sig-wrap{margin-top:18px;display:flex;justify-content:flex-end}
  .sig-box{text-align:center;min-width:180px}
  .sig-line{height:1px;background:${dark?'rgba(255,255,255,0.15)':'#ddd'};margin:24px 0 6px}
  .footer{margin-top:18px;padding-top:12px;border-top:1px solid ${dark?'rgba(255,255,255,0.06)':'#eee'};display:flex;justify-content:space-between;align-items:center;font-size:10px;color:${faintColor}}
  .footer-brand{font-weight:700;color:${t.footerColor}}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:28px 36px}}
  @page { size: A4; margin: 0; }
</style></head><body>
<div class="page">
  <div class="hdr">
    ${leftHeader}
    <div class="inv-right">
      <div class="inv-title">INVOICE</div>
      <div style="font-size:13px;font-weight:600;color:${mutedColor};margin-top:3px">${inv.invoiceNumber}</div>
      <div><span class="status-pill">${inv.status==='Draft'?'Due':inv.status}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="pbox" style="background:${t.billBg};border:1px solid ${t.billBorder}">
      <div class="plbl">Bill To</div>
      <div class="pname">${inv.customer?.name||''}</div>
      ${inv.customer?.email   ? `<div class="pdetail">${inv.customer.email}</div>` : ''}
      ${inv.customer?.address ? `<div class="pdetail">${inv.customer.address}</div>` : ''}
      ${inv.customer?.gstin   ? `<div><span class="pgstin">GSTIN: ${inv.customer.gstin}</span></div>` : ''}
    </div>
    <div class="pbox" style="background:${t.detBg};border:1px solid ${t.detBorder}">
      <div class="plbl">Invoice Details</div>
      <div class="mgrid">
        <span class="ml">Invoice No.</span><span class="mv">${inv.invoiceNumber}</span>
        <span class="ml">Issue Date</span><span class="mv">${fmtDate(inv.issueDate)}</span>
        <span class="ml">Due Date</span><span class="mv" style="${inv.status==='Overdue'?'color:#A32D2D':''}">${fmtDate(inv.dueDate)}</span>
        <span class="ml">Currency</span><span class="mv">${inv.currency||'INR'}</span>
        ${cfg?.sacCode ? `<span class="ml">SAC</span><span class="mv mono">${cfg.sacCode}</span>` : ''}
        ${inv.paidAmount>0 ? `<span class="ml">Paid</span><span class="mv" style="color:#3B6D11">${fmt(inv.paidAmount)}</span>` : ''}
      </div>
    </div>
  </div>

  <div class="twrap">
    <table>
      <thead><tr>
        <th class="th tc" style="width:32px">#</th><th class="th">Description</th>
        <th class="th tr" style="width:52px">Qty</th><th class="th tr" style="width:105px">Rate</th>
        <th class="th tc" style="width:56px">Tax</th><th class="th tr" style="width:115px">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tot-wrap">
      <div class="tot-box">
        <div class="trow"><span>Subtotal</span><span class="tv">${fmt(inv.subtotal)}</span></div>
        <div class="trow"><span>Tax (GST)</span><span class="tv">${fmt(inv.taxTotal)}</span></div>
        ${inv.paidAmount>0 ? `<div class="trow paid"><span>Amount Paid</span><span class="tv">- ${fmt(inv.paidAmount)}</span></div>` : ''}
        <div class="tfinal"><span>Balance Due</span><span class="tv">${fmt(dueBalance)}</span></div>
      </div>
    </div>
  </div>

  ${hasBankDetails ? `
  <div class="bank-wrap">
    <div class="bank-box">
      <div class="bank-lbl">Bank Details</div>
      <div class="bank-grid">
        ${cfg?.bankName      ? `<span class="bl">Bank</span><span class="bv">${cfg.bankName}</span>` : ''}
        ${cfg?.accountName   ? `<span class="bl">Account Name</span><span class="bv">${cfg.accountName}</span>` : ''}
        ${cfg?.accountNumber ? `<span class="bl">Account No.</span><span class="bv mono">${cfg.accountNumber}</span>` : ''}
        ${cfg?.ifscCode      ? `<span class="bl">IFSC</span><span class="bv mono">${cfg.ifscCode}</span>` : ''}
        ${cfg?.bankBranch    ? `<span class="bl">Branch</span><span class="bv">${cfg.bankBranch}</span>` : ''}
        ${cfg?.upiId         ? `<span class="bl">UPI ID</span><span class="bv mono">${cfg.upiId}</span>` : ''}
      </div>
    </div>
    ${cfg?.paymentInstructions ? `
    <div class="bank-box" style="background:${dark?'rgba(245,158,11,0.08)':'#FFFBF0'};border-color:${dark?'rgba(245,158,11,0.2)':'#F6CC7C'}">
      <div class="bank-lbl" style="color:#92400E">Payment Instructions</div>
      <div style="font-size:11px;color:${mutedColor};line-height:1.6">${cfg.paymentInstructions}</div>
    </div>` : ''}
  </div>` : ''}

  ${inv.notes || inv.terms ? `
  <div class="notes-wrap">
    ${inv.notes ? `<div class="note-box" style="background:${t.notesBg};border-left:3px solid ${t.notesBorder}"><div class="note-lbl">Notes</div><div class="note-txt">${inv.notes}</div></div>` : '<div></div>'}
    ${inv.terms ? `<div class="note-box" style="background:${t.termsBg};border-left:3px solid ${t.termsBorder}"><div class="note-lbl">Terms &amp; Conditions</div><div class="note-txt">${inv.terms}</div></div>` : ''}
  </div>` : ''}

  ${(cfg?.signatureName || cfg?.signatureImage) ? (
    '<div class="sig-wrap"><div class="sig-box">' +
    '<div style="font-size:10px;color:' + faintColor + ';margin-bottom:6px">For ' + biz + '</div>' +
    (cfg.signatureImage
      ? '<img src="' + cfg.signatureImage + '" alt="Signature" style="height:52px;max-width:200px;object-fit:contain;display:block;margin:0 auto 4px"/>'
      : '<div class="sig-line"></div>'
    ) +
    (cfg.signatureName ? '<div style="font-size:12px;font-weight:700;color:' + bodyColor + '">' + cfg.signatureName + '</div>' : '') +
    (cfg.signatureTitle ? '<div style="font-size:11px;color:' + mutedColor + '">' + cfg.signatureTitle + '</div>' : '') +
    '<div style="font-size:10px;color:' + faintColor + ';margin-top:2px">Authorized Signatory</div>' +
    '</div></div>'
  ) : ''}

  <div class="footer">
    <span>${cfg?.footerText||'This is a computer-generated invoice.'}</span>
    <span><span class="footer-brand">${biz}</span> &middot; ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
  </div>
</div>
<script>
if(window.location.search.includes('print=1')){
  window.onload = () => {
    // Small delay to ensure images/fonts load
    setTimeout(() => window.print(), 500)
  }
}
</script>
</body></html>`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    await connectDB()
    const orgId = req.headers['x-org-id'] || req.query.orgId || 'default'
    const [invoice, config] = await Promise.all([
      Invoice.findById(req.query.id),
      OrgConfig.findOne({ orgId }),
    ])
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    const templateKey = invoice.template || 'classic'
    const t = TEMPLATES[templateKey] || TEMPLATES.classic
    // Convert to plain objects so all fields including signatureImage are accessible
    const cfgObj = config ? (config.toObject ? config.toObject() : config) : {}
    console.log('[pdf] orgId:', orgId, 'signatureName:', cfgObj.signatureName, 'signatureImage len:', cfgObj.signatureImage?.length || 0)
    const html = buildHTML(invoice, cfgObj, t)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // If download=1, add Content-Disposition so browser prompts save dialog
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.html"`)
    }
    return res.send(html)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}