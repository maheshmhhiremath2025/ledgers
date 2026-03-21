import { connectDB } from '../../../../lib/mongodb'
import Invoice from '../../../../models/Invoice'
import OrgConfig from '../../../../models/OrgConfig'

function fmtMoney(n, sym = 'INR ') {
  return sym + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d || '' }
}

async function generatePDF(inv, cfg) {
  const { default: PDFDocument } = await import('pdfkit')

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
      const chunks = []
      doc.on('data', c => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.registerFont('Regular', 'Helvetica')
      doc.registerFont('Bold', 'Helvetica-Bold')

      const W = doc.page.width
      const ACCENT = '#6366F1'
      const ACCENT_LIGHT = '#EEF2FF'
      const TEXT = '#1a1a1a'
      const MUTED = '#666666'
      const FAINT = '#999999'
      const LINE = '#DDD6FE'
      const L = 40
      const R = W - 40
      const CW = W - 80
      let y = 40

      const sym = inv.currency === 'INR' ? 'INR ' : ((inv.currency || 'INR') + ' ')

      // ── LOGO ──
      const logoB64 = cfg.logoUrl || ''
      if (logoB64 && logoB64.startsWith('data:image')) {
        try {
          const buf = Buffer.from(logoB64.split(',')[1], 'base64')
          doc.image(buf, L, y, { fit: [120, 40], align: 'left' })
        } catch {}
      }

      // ── INVOICE title ──
      doc.font('Bold').fontSize(22).fillColor(ACCENT).text('INVOICE', L, y, { align: 'right', width: CW })
      doc.font('Regular').fontSize(10).fillColor(MUTED).text(inv.invoiceNumber || '', L, y + 26, { align: 'right', width: CW })
      doc.font('Regular').fontSize(9).fillColor('#185FA5').text((inv.status || '').toUpperCase(), L, y + 40, { align: 'right', width: CW })
      y += 56

      // ── Business info — address, contact, GSTIN/PAN badges ──
      let biy = y
      if (cfg.businessAddress) {
        doc.font('Regular').fontSize(8).fillColor(MUTED)
          .text(cfg.businessAddress.replace(/\n/g, '  '), L, biy, { width: CW / 2 })
        biy += 11
      }
      const contactParts = [cfg.businessEmail, cfg.businessPhone].filter(Boolean)
      if (contactParts.length) {
        doc.font('Regular').fontSize(8).fillColor(MUTED)
          .text(contactParts.join('  |  '), L, biy, { width: CW / 2 })
        biy += 11
      }
      if (cfg.gstin) {
        doc.rect(L, biy, 70, 13).fillAndStroke('#1E2140', '#1E2140')
        doc.font('Bold').fontSize(7.5).fillColor('#fff').text('GSTIN: ' + cfg.gstin, L + 4, biy + 3, { width: 62 })
        if (cfg.pan) {
          doc.rect(L + 74, biy, 55, 13).fillAndStroke('#FEF3C7', '#F59E0B')
          doc.font('Bold').fontSize(7.5).fillColor('#92400E').text('PAN: ' + cfg.pan, L + 78, biy + 3, { width: 47 })
        }
        biy += 18
      } else if (cfg.pan) {
        doc.rect(L, biy, 55, 13).fillAndStroke('#FEF3C7', '#F59E0B')
        doc.font('Bold').fontSize(7.5).fillColor('#92400E').text('PAN: ' + cfg.pan, L + 4, biy + 3, { width: 47 })
        biy += 18
      }
      y = Math.max(y + 56, biy + 6)

      doc.moveTo(L, y).lineTo(R, y).lineWidth(2).strokeColor(ACCENT).stroke()
      y += 6

      // ── BILL TO / INVOICE DETAILS ──
      const colMid = L + CW / 2 + 4
      const colW2 = CW / 2 - 4
      const cust = inv.customer || {}

      doc.rect(L, y, colW2, 72).fillAndStroke(ACCENT_LIGHT, LINE)
      let ly = y + 6
      doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('BILL TO', L + 8, ly)
      ly += 12
      doc.font('Bold').fontSize(10).fillColor(TEXT).text(cust.name || '', L + 8, ly, { width: colW2 - 12 })
      ly += 13
      doc.font('Regular').fontSize(8).fillColor(MUTED)
      if (cust.email)   { doc.text(cust.email,   L + 8, ly, { width: colW2 - 12 }); ly += 10 }
      if (cust.address) { doc.text(cust.address, L + 8, ly, { width: colW2 - 12 }); ly += 10 }
      if (cust.gstin)   { doc.text(`GSTIN: ${cust.gstin}`, L + 8, ly, { width: colW2 - 12 }) }

      doc.rect(colMid, y, colW2, 72).fillAndStroke('#F5F3FF', LINE)
      let ry = y + 6
      doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('INVOICE DETAILS', colMid + 8, ry)
      ry += 12
      const details = [['Invoice #', inv.invoiceNumber], ['Issue Date', fmtDate(inv.issueDate)], ['Due Date', fmtDate(inv.dueDate)], ['Currency', inv.currency || 'INR']]
      for (const [lbl, val] of details) {
        doc.font('Regular').fillColor(MUTED).text(lbl + ':', colMid + 8, ry)
        doc.font('Bold').fillColor(TEXT).text(val || '', colMid + 75, ry, { width: colW2 - 83 })
        ry += 11
      }
      y += 80

      // ── LINE ITEMS ──
      const colWidths = [22, 213, 50, 85, 45, 100]
      const headers = ['#', 'Description', 'Qty', 'Rate', 'Tax', 'Amount']
      const aligns = ['center', 'left', 'right', 'right', 'center', 'right']
      const lineH = 22
      const padL = 5

      doc.rect(L, y, CW, lineH).fill(ACCENT)
      let cx = L
      for (let i = 0; i < headers.length; i++) {
        doc.font('Bold').fontSize(8).fillColor('white').text(headers[i], cx + padL, y + 7, { width: colWidths[i] - padL * 2, align: aligns[i] })
        cx += colWidths[i]
      }
      y += lineH

      let subtotal = 0, taxTotal = 0
      for (let i = 0; i < (inv.lineItems || []).length; i++) {
        const item = inv.lineItems[i]
        const qty = parseFloat(item.qty || 0)
        const rate = parseFloat(item.rate || 0)
        const tax = parseFloat(item.tax || 0)
        const base = qty * rate
        const txv = base * tax / 100
        const amt = base + txv
        subtotal += base; taxTotal += txv
        doc.rect(L, y, CW, lineH).fill(i % 2 === 0 ? ACCENT_LIGHT : '#ffffff')
        const cells = [String(i+1), item.description||'', String(qty%1===0?qty:qty.toFixed(2)), fmtMoney(rate,sym), `${Math.round(tax)}%`, fmtMoney(amt,sym)]
        cx = L
        for (let j = 0; j < cells.length; j++) {
          doc.font(j===5?'Bold':'Regular').fontSize(8.5).fillColor(TEXT).text(cells[j], cx+padL, y+7, { width: colWidths[j]-padL*2, align: aligns[j] })
          cx += colWidths[j]
        }
        doc.rect(L, y, CW, lineH).stroke(LINE)
        y += lineH
      }

      // ── TOTALS ──
      const grand = subtotal + taxTotal
      const paid = parseFloat(inv.paidAmount || 0)
      const balance = grand - paid
      const totW = 200, totX = R - totW, lblW = 90, valW = 110
      y += 4
      const totRows = [['Subtotal', fmtMoney(subtotal,sym), false], ['Tax (GST)', fmtMoney(taxTotal,sym), false], ...(paid>0?[['Paid', fmtMoney(paid,sym), false]]:[]), ['Balance Due', fmtMoney(balance,sym), true]]
      for (const [lbl, val, bold] of totRows) {
        if (bold) { doc.moveTo(totX, y).lineTo(R, y).lineWidth(1).strokeColor(ACCENT).stroke(); y += 5 }
        doc.font('Regular').fontSize(bold?10:9).fillColor(bold?ACCENT:(lbl==='Paid'?'#3B6D11':MUTED)).text(lbl, totX, y, { width: lblW })
        doc.font(bold?'Bold':'Regular').fontSize(bold?10:9).fillColor(bold?ACCENT:TEXT).text(val, totX+lblW, y, { width: valW, align: 'right' })
        y += bold ? 16 : 13
      }
      y += 10

      // ── BANK DETAILS ──
      const bankFields = [['Bank', cfg.bankName],['Account Name',cfg.accountName],['Account No.',cfg.accountNumber],['IFSC',cfg.ifscCode],['Branch',cfg.bankBranch],['UPI',cfg.upiId]].filter(([,v])=>v)
      if (bankFields.length) {
        const bh = 14 + bankFields.length * 12
        doc.rect(L, y, CW/2-4, bh).fillAndStroke(ACCENT_LIGHT, LINE)
        doc.font('Bold').fontSize(7.5).fillColor(ACCENT).text('BANK DETAILS', L+8, y+6)
        let by = y+18
        for (const [lbl,val] of bankFields) {
          doc.font('Regular').fontSize(8).fillColor(MUTED).text(lbl+':', L+8, by)
          doc.font('Bold').fontSize(8).fillColor(TEXT).text(val, L+80, by, { width: CW/2-100 })
          by += 12
        }
        y += bh + 6
      }

      // ── NOTES & TERMS ──
      const notes = inv.notes || '', terms = inv.terms || ''
      if (notes || terms) {
        const half = CW/2-4
        if (notes) {
          doc.rect(L, y, half, 40).fillAndStroke('#FFFBF0', '#F59E0B')
          doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('NOTES', L+8, y+5)
          doc.font('Regular').fontSize(8).fillColor(MUTED).text(notes, L+8, y+16, { width: half-16 })
        }
        if (terms) {
          const tx = notes ? L+half+8 : L
          doc.rect(tx, y, half, 40).fillAndStroke('#F5F3FF', LINE)
          doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('TERMS & CONDITIONS', tx+8, y+5)
          doc.font('Regular').fontSize(8).fillColor(MUTED).text(terms, tx+8, y+16, { width: half-16 })
        }
        y += 48
      }

      // ── SIGNATURE ──
      const sigName = cfg.signatureName||'', sigTitle = cfg.signatureTitle||'', sigImg = cfg.signatureImage||''
      if (sigName || sigImg) {
        const sigX = R - 160
        doc.font('Regular').fontSize(8).fillColor(FAINT).text(`For ${cfg.businessName||''}`, sigX, y+4, { width: 160, align: 'center' })
        y += 16
        if (sigImg && sigImg.startsWith('data:image')) {
          try { const buf = Buffer.from(sigImg.split(',')[1],'base64'); doc.image(buf, sigX+20, y, { fit:[120,36], align:'center' }); y += 40 } catch { y += 20 }
        } else { doc.moveTo(sigX+10, y+20).lineTo(R-10, y+20).lineWidth(0.5).strokeColor(LINE).stroke(); y += 26 }
        if (sigName)  { doc.font('Bold').fontSize(9).fillColor(TEXT).text(sigName, sigX, y, { width:160, align:'center' }); y += 11 }
        if (sigTitle) { doc.font('Regular').fontSize(8).fillColor(MUTED).text(sigTitle, sigX, y, { width:160, align:'center' }); y += 11 }
        doc.font('Regular').fontSize(8).fillColor(FAINT).text('Authorized Signatory', sigX, y, { width:160, align:'center' })
        y += 20
      }

      // ── FOOTER ──
      doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor(LINE).stroke()
      y += 5
      const dateStr = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
      doc.font('Regular').fontSize(7.5).fillColor(FAINT).text(cfg.footerText||'This is a computer-generated invoice.', L, y, { width: CW/2 })
      doc.font('Regular').fontSize(7.5).fillColor(FAINT).text(`${cfg.businessName||''}  ·  ${dateStr}`, L, y, { width: CW, align: 'right' })

      doc.end()
    } catch(e) { reject(e) }
  })
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
    const cfgObj = config ? (config.toObject ? config.toObject() : config) : {}
    const invObj = invoice.toObject ? invoice.toObject() : invoice

    const pdfBuffer = await generatePDF(invObj, cfgObj)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    return res.send(pdfBuffer)
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}