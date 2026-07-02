import { connectDB } from '../../../../lib/mongodb'
import Estimate from '../../../../models/Estimate'
import OrgConfig from '../../../../models/OrgConfig'
import { requireAuth } from '../../../../lib/auth'

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

function buildHTML(est, cfg, t) {
  const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const statusColor = {
    Draft: '#BA7517', Sent: '#2563EB', Accepted: '#3B6D11',
    Declined: '#A32D2D', Invoiced: '#6366F1', Expired: '#92400E',
  }
  const sc = statusColor[est.status] || '#888'
  const dark = t.dark || false

  const F = {
    logo: true, businessAddress: true, businessPhone: true, businessEmail: true, businessWebsite: false,
    gstin: true, pan: true, sacCode: true, customerEmail: true, customerAddress: true, customerGstin: true,
    dueDate: true, currency: false, taxColumn: true, taxBreakdown: true,
    bankDetails: true, paymentInstr: true, notes: true, terms: true, signature: true, footerText: true,
    ...(cfg?.pdfFields || {}),
  }

  const biz = cfg?.businessName || 'HexaLabs'
  const logoUrl = F.logo ? (cfg?.logoUrl || '') : ''
  const bodyColor  = dark ? '#ECEEF8' : '#1a1a1a'
  const mutedColor = dark ? '#9EA3BF' : '#666'
  const faintColor = dark ? '#636880' : '#999'
  const bodyBg     = dark ? '#0D0F1A' : '#fff'

  const rows = (est.lineItems || []).map((item, i) => {
    const hrs = item.hours || 1
    const lt = (item.qty || 0) * hrs * (item.rate || 0), ta = lt * (item.tax || 0) / 100
    const rowBg = dark ? (i % 2 === 0 ? '#1E2140' : '#252848') : (i % 2 === 0 ? '#fff' : t.billBg)
    return `<tr style="background:${rowBg}">
      <td class="td tc" style="color:${bodyColor}">${i + 1}</td>
      <td class="td" style="color:${bodyColor}">${item.description || ''}</td>
      <td class="td tr" style="color:${bodyColor}">${item.qty}</td>
      <td class="td tr" style="color:${bodyColor}">${fmt(item.rate)}</td>
      <td class="td tr" style="color:${bodyColor}">${hrs}</td>
      ${F.taxColumn ? `<td class="td tc" style="color:${bodyColor}">${item.tax || 0}%</td>` : ''}
      <td class="td tr fw" style="color:${bodyColor}">${fmt(lt + ta)}</td>
    </tr>`
  }).join('')

  const contactParts = []
  if (F.businessEmail && cfg?.businessEmail) contactParts.push(cfg.businessEmail)
  if (F.businessPhone && cfg?.businessPhone) contactParts.push(cfg.businessPhone)
  const contactLine = contactParts.join(' &nbsp;|&nbsp; ')
  const addrLine = F.businessAddress && cfg?.businessAddress ? cfg.businessAddress.replace(/\n/g, '<br>') + '<br>' : ''
  const webLine  = F.businessWebsite && cfg?.businessWebsite ? '<br>' + cfg.businessWebsite : ''
  const gstinTag = F.gstin && cfg?.gstin ? `<span class="tag" style="background:${t.primaryLight};color:${t.primary}">GSTIN: ${cfg.gstin}</span>` : ''
  const panTag   = F.pan && cfg?.pan     ? `<span class="tag" style="background:#FEF3C7;color:#92400E;margin-left:4px">PAN: ${cfg.pan}</span>` : ''

  const leftHeader = logoUrl
    ? `<div>
        <img src="${logoUrl}" alt="${biz}" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin-bottom:5px"/>
        <div style="font-size:11px;color:${mutedColor};line-height:1.7">${addrLine}${contactLine}</div>
        ${gstinTag || panTag ? `<div style="margin-top:5px">${gstinTag}${panTag}</div>` : ''}
      </div>`
    : `<div>
        <div style="font-size:20px;font-weight:700;color:${t.primary};margin-bottom:4px">${biz}</div>
        <div style="font-size:11px;color:${mutedColor};line-height:1.7">${addrLine}${contactLine}${webLine}</div>
        ${gstinTag || panTag ? `<div style="margin-top:5px">${gstinTag}${panTag}</div>` : ''}
      </div>`

  const hasBankDetails = cfg?.bankName || cfg?.accountNumber || cfg?.ifscCode

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${est.estimateNumber}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:${bodyColor};background:${bodyBg}}
  .page{max-width:794px;margin:0 auto;padding:40px 44px 36px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:${t.borderStyle || `2.5px solid ${t.primary}`}}
  .tag{display:inline-block;font-size:10px;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:600}
  .inv-right{text-align:right;flex-shrink:0;margin-left:20px}
  .inv-title{font-size:28px;font-weight:800;color:${t.primary};letter-spacing:-1px}
  .status-pill{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;background:${sc}18;color:${sc};border:1px solid ${sc}40;margin-top:5px;text-transform:uppercase}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px}
  .pbox{border-radius:8px;padding:14px 16px}
  .plbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${faintColor};margin-bottom:7px}
  .pname{font-size:14px;font-weight:700;color:${bodyColor};margin-bottom:3px}
  .pdetail{font-size:11px;color:${mutedColor};line-height:1.65}
  .pgstin{display:inline-block;margin-top:4px;font-size:10px;background:${dark ? 'rgba(255,255,255,0.08)' : '#fff'};border:1px solid ${dark ? 'rgba(255,255,255,0.12)' : '#ddd'};padding:2px 7px;border-radius:3px;color:${mutedColor};font-family:monospace}
  .mgrid{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11px}
  .mgrid .ml{color:${faintColor}}.mgrid .mv{font-weight:600;color:${bodyColor}}
  .twrap{border:1px solid ${dark ? 'rgba(255,255,255,0.1)' : t.billBorder};border-radius:8px;overflow:hidden}
  table{width:100%;border-collapse:collapse}
  .th{background:${t.tableHead};color:${t.tableHeadText};padding:9px 11px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:left}
  .th.tr{text-align:right}.th.tc{text-align:center}
  .td{padding:9px 11px;border-bottom:1px solid ${dark ? 'rgba(255,255,255,0.06)' : t.billBorder};font-size:12px;vertical-align:top;color:${bodyColor}}
  .tr{text-align:right;font-variant-numeric:tabular-nums}.tc{text-align:center}.fw{font-weight:600}
  tr:nth-child(even) td{background:${dark ? 'rgba(255,255,255,0.02)' : t.billBg}}
  tr:last-child td{border-bottom:none}
  .tot-wrap{background:${t.totBg};padding:14px 16px;border-top:1.5px solid ${t.totBorder};display:flex;justify-content:flex-end}
  .tot-box{width:260px}
  .trow{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:${mutedColor};border-bottom:1px dashed ${dark ? 'rgba(255,255,255,0.1)' : '#eee'}}
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
  .sig-line{height:1px;background:${dark ? 'rgba(255,255,255,0.15)' : '#ddd'};margin:24px 0 6px}
  .footer{margin-top:18px;padding-top:12px;border-top:1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#eee'};display:flex;justify-content:space-between;align-items:center;font-size:10px;color:${faintColor}}
  .footer-brand{font-weight:700;color:${t.footerColor}}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:28px 36px}}
  @page { size: A4; margin: 0; }
</style></head><body>
<div class="page">
  <div class="hdr">
    ${leftHeader}
    <div class="inv-right">
      <div class="inv-title">QUOTATION</div>
      <div style="font-size:13px;font-weight:600;color:${mutedColor};margin-top:3px">${est.estimateNumber}</div>
      <div><span class="status-pill">${est.status || 'Draft'}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="pbox" style="background:${t.billBg};border:1px solid ${t.billBorder}">
      <div class="plbl">Quote To</div>
      <div class="pname">${est.customer?.name || ''}</div>
      ${F.customerEmail && est.customer?.email   ? `<div class="pdetail">${est.customer.email}</div>` : ''}
      ${est.customer?.phone                       ? `<div class="pdetail">${est.customer.phone}</div>` : ''}
      ${F.customerAddress && est.customer?.address ? `<div class="pdetail">${est.customer.address}</div>` : ''}
      ${F.customerGstin && est.customer?.gstin   ? `<div><span class="pgstin">GSTIN: ${est.customer.gstin}</span></div>` : ''}
    </div>
    <div class="pbox" style="background:${t.detBg};border:1px solid ${t.detBorder}">
      <div class="plbl">Quotation Details</div>
      <div class="mgrid">
        <span class="ml">Quotation No.</span><span class="mv">${est.estimateNumber}</span>
        <span class="ml">Issue Date</span><span class="mv">${fmtDate(est.issueDate)}</span>
        ${F.dueDate && est.expiryDate ? `<span class="ml">Valid Until</span><span class="mv">${fmtDate(est.expiryDate)}</span>` : ''}
        ${F.currency ? `<span class="ml">Currency</span><span class="mv">${est.currency || 'INR'}</span>` : ''}
        ${F.sacCode && cfg?.sacCode ? `<span class="ml">SAC</span><span class="mv mono">${cfg.sacCode}</span>` : ''}
      </div>
    </div>
  </div>

  <div class="twrap">
    <table>
      <thead><tr>
        <th class="th tc" style="width:32px">#</th><th class="th">Description</th>
        <th class="th tr" style="width:52px">Qty</th><th class="th tr" style="width:105px">Rate</th>
        <th class="th tr" style="width:56px">Hours</th>
        ${F.taxColumn ? '<th class="th tc" style="width:56px">Tax</th>' : ''}<th class="th tr" style="width:115px">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tot-wrap">
      <div class="tot-box">
        <div class="trow"><span>Subtotal</span><span class="tv">${fmt(est.subtotal)}</span></div>
        ${F.taxBreakdown ? ((est.taxType === 'inter' || (est.igstTotal || 0) > 0)
          ? `<div class="trow"><span>IGST</span><span class="tv">${fmt(est.igstTotal || est.taxTotal || 0)}</span></div>`
          : `<div class="trow"><span>CGST</span><span class="tv">${fmt(est.cgstTotal != null ? est.cgstTotal : (est.taxTotal || 0) / 2)}</span></div>
             <div class="trow"><span>SGST</span><span class="tv">${fmt(est.sgstTotal != null ? est.sgstTotal : (est.taxTotal || 0) / 2)}</span></div>`)
          : (est.taxTotal > 0 ? `<div class="trow"><span>Tax</span><span class="tv">${fmt(est.taxTotal)}</span></div>` : '')}
        <div class="tfinal"><span>Total</span><span class="tv">${fmt(est.total)}</span></div>
      </div>
    </div>
  </div>

  ${F.bankDetails && hasBankDetails ? `
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
    ${F.paymentInstr && cfg?.paymentInstructions ? `
    <div class="bank-box" style="background:${dark ? 'rgba(245,158,11,0.08)' : '#FFFBF0'};border-color:${dark ? 'rgba(245,158,11,0.2)' : '#F6CC7C'}">
      <div class="bank-lbl" style="color:#92400E">Payment Instructions</div>
      <div style="font-size:11px;color:${mutedColor};line-height:1.6">${cfg.paymentInstructions}</div>
    </div>` : ''}
  </div>` : ''}

  ${(F.notes && est.notes) || (F.terms && est.terms) ? `
  <div class="notes-wrap">
    ${F.notes && est.notes ? `<div class="note-box" style="background:${t.notesBg};border-left:3px solid ${t.notesBorder}"><div class="note-lbl">Notes</div><div class="note-txt">${est.notes}</div></div>` : '<div></div>'}
    ${F.terms && est.terms ? `<div class="note-box" style="background:${t.termsBg};border-left:3px solid ${t.termsBorder}"><div class="note-lbl">Terms &amp; Conditions</div><div class="note-txt">${est.terms}</div></div>` : ''}
  </div>` : ''}

  ${F.signature && (cfg?.signatureName || cfg?.signatureImage) ? (
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

  ${F.footerText ? `<div class="footer">
    <span>${cfg?.footerText || 'This is a computer-generated quotation.'}</span>` : '<div class="footer"><span></span>'}
    <span><span class="footer-brand">${biz}</span> &middot; ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
  </div>
</div>
<script>
if(window.location.search.includes('print=1')){
  window.onload = () => { setTimeout(() => window.print(), 500) }
}
</script>
</body></html>`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    await connectDB()
    const auth = requireAuth(req, res); if (!auth) return
    const orgId = auth.orgId
    const [est, config] = await Promise.all([
      Estimate.findOne({ _id: req.query.id, orgId }),
      OrgConfig.findOne({ orgId }),
    ])
    if (!est) return res.status(404).json({ error: 'Estimate not found' })
    const templateKey = est.template || 'classic'
    const t = TEMPLATES[templateKey] || TEMPLATES.classic
    const cfgObj = config ? (config.toObject ? config.toObject() : config) : {}
    const html = buildHTML(est, cfgObj, t)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${est.estimateNumber}.html"`)
    }
    return res.send(html)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
