// Minimal shared PDF generator for "document with line items" — used by
// estimates and vendor bills. Invoices have their own richer templates.
//
// Usage:
//   const buf = await generateDocPdf({
//     title: 'ESTIMATE',
//     number: est.estimateNumber,
//     status: est.status,
//     dateLabel: 'Date', date: est.issueDate,
//     dueLabel:  'Valid Until', dueDate: est.expiryDate,
//     party: est.customer, partyLabel: 'Quote To',
//     lineItems: est.lineItems, subtotal, taxTotal, total,
//     notes, terms, currency,
//   }, cfg)
export async function generateDocPdf(doc, cfg = {}) {
  const { default: PDFDocument } = await import('pdfkit')
  const sym = (doc.currency || 'INR') === 'INR' ? 'INR ' : (doc.currency || 'INR') + ' '
  const fmt = (n) => sym + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : ''

  return new Promise((resolve, reject) => {
    try {
      const pdf = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
      const chunks = []
      pdf.on('data', c => chunks.push(c))
      pdf.on('end', () => resolve(Buffer.concat(chunks)))
      pdf.on('error', reject)

      pdf.registerFont('Regular', 'Helvetica')
      pdf.registerFont('Bold', 'Helvetica-Bold')

      const W = pdf.page.width
      const L = 40
      const R = W - 40
      const CW = W - 80
      const ACCENT = '#6366F1'
      const TEXT   = '#1a1a1a'
      const MUTED  = '#666666'
      const LINE   = '#E5E7EB'
      let y = 40

      // ── Header: logo left, title right ──
      if (cfg.logoUrl && cfg.logoUrl.startsWith('data:image')) {
        try {
          const buf = Buffer.from(cfg.logoUrl.split(',')[1], 'base64')
          pdf.image(buf, L, y, { fit: [120, 40] })
        } catch {}
      }
      pdf.font('Bold').fontSize(22).fillColor(ACCENT).text(doc.title, L, y, { align: 'right', width: CW })
      pdf.font('Regular').fontSize(10).fillColor(MUTED).text(doc.number || '', L, y + 26, { align: 'right', width: CW })
      if (doc.status) pdf.font('Regular').fontSize(9).fillColor(ACCENT).text(String(doc.status).toUpperCase(), L, y + 40, { align: 'right', width: CW })
      y += 60

      // ── Business info ──
      if (cfg.businessName) {
        pdf.font('Bold').fontSize(11).fillColor(TEXT).text(cfg.businessName, L, y, { width: CW / 2 })
        y += 14
      }
      if (cfg.businessAddress) {
        pdf.font('Regular').fontSize(8).fillColor(MUTED).text(cfg.businessAddress.replace(/\n/g, '  '), L, y, { width: CW / 2 })
        y += 10
      }
      const contact = [cfg.businessEmail, cfg.businessPhone].filter(Boolean).join('  |  ')
      if (contact) { pdf.font('Regular').fontSize(8).fillColor(MUTED).text(contact, L, y, { width: CW / 2 }); y += 10 }
      if (cfg.gstin || cfg.pan) {
        const parts = []
        if (cfg.gstin) parts.push('GSTIN: ' + cfg.gstin)
        if (cfg.pan)   parts.push('PAN: ' + cfg.pan)
        pdf.font('Bold').fontSize(8).fillColor(ACCENT).text(parts.join('  |  '), L, y, { width: CW / 2 })
        y += 12
      }

      y += 10

      // ── Party block (Bill To / Quote To) ──
      const boxY = y
      pdf.rect(L, boxY, CW / 2 - 6, 80).fill('#F9FAFB')
      pdf.font('Bold').fontSize(9).fillColor(ACCENT).text(doc.partyLabel || 'To', L + 10, boxY + 10)
      pdf.font('Bold').fontSize(11).fillColor(TEXT).text(doc.party?.name || '—', L + 10, boxY + 22, { width: CW / 2 - 20 })
      let py = boxY + 38
      if (doc.party?.email)   { pdf.font('Regular').fontSize(8).fillColor(MUTED).text(doc.party.email,   L + 10, py, { width: CW / 2 - 20 }); py += 10 }
      if (doc.party?.phone)   { pdf.font('Regular').fontSize(8).fillColor(MUTED).text(doc.party.phone,   L + 10, py, { width: CW / 2 - 20 }); py += 10 }
      if (doc.party?.address) { pdf.font('Regular').fontSize(8).fillColor(MUTED).text(doc.party.address, L + 10, py, { width: CW / 2 - 20 }); py += 10 }
      if (doc.party?.gstin)   { pdf.font('Regular').fontSize(8).fillColor(MUTED).text('GSTIN: ' + doc.party.gstin, L + 10, py, { width: CW / 2 - 20 }) }

      // Dates box on the right
      const dbx = L + CW / 2 + 6
      pdf.rect(dbx, boxY, CW / 2 - 6, 80).fill('#F9FAFB')
      let dy = boxY + 10
      pdf.font('Bold').fontSize(8).fillColor(MUTED).text(doc.dateLabel || 'Date', dbx + 10, dy)
      pdf.font('Bold').fontSize(10).fillColor(TEXT).text(fmtDate(doc.date), dbx + 80, dy)
      dy += 14
      if (doc.dueDate) {
        pdf.font('Bold').fontSize(8).fillColor(MUTED).text(doc.dueLabel || 'Due Date', dbx + 10, dy)
        pdf.font('Bold').fontSize(10).fillColor(TEXT).text(fmtDate(doc.dueDate), dbx + 80, dy)
        dy += 14
      }
      if (doc.vendorBillNumber) {
        pdf.font('Bold').fontSize(8).fillColor(MUTED).text("Vendor Bill #", dbx + 10, dy)
        pdf.font('Regular').fontSize(9).fillColor(TEXT).text(doc.vendorBillNumber, dbx + 80, dy)
      }

      y = boxY + 92

      // ── Line items table ──
      pdf.rect(L, y, CW, 22).fill(ACCENT)
      pdf.font('Bold').fontSize(9).fillColor('#fff')
      pdf.text('#',           L + 8,  y + 7, { width: 20 })
      pdf.text('DESCRIPTION', L + 32, y + 7, { width: 220 })
      pdf.text('QTY',         L + 260, y + 7, { width: 40,  align: 'right' })
      pdf.text('RATE',        L + 305, y + 7, { width: 60,  align: 'right' })
      pdf.text('TAX',         L + 370, y + 7, { width: 40,  align: 'right' })
      pdf.text('AMOUNT',      L + 415, y + 7, { width: CW - 415 - 8, align: 'right' })
      y += 22

      for (let i = 0; i < (doc.lineItems || []).length; i++) {
        const li = doc.lineItems[i]
        if (y > 720) { pdf.addPage(); y = 40 }
        if (i % 2 === 0) { pdf.rect(L, y, CW, 18).fill('#F9FAFB') }
        pdf.font('Regular').fontSize(9).fillColor(TEXT)
        pdf.text(String(i + 1), L + 8, y + 5)
        pdf.text(li.description || '', L + 32, y + 5, { width: 220 })
        pdf.text(String(li.qty ?? ''),  L + 260, y + 5, { width: 40, align: 'right' })
        pdf.text(fmt(li.rate), L + 305, y + 5, { width: 60, align: 'right' })
        pdf.text((li.tax || 0) + '%', L + 370, y + 5, { width: 40, align: 'right' })
        pdf.text(fmt(li.amount || 0), L + 415, y + 5, { width: CW - 415 - 8, align: 'right' })
        y += 18
      }

      y += 10
      // Totals box on the right with CGST/SGST/IGST split
      const isInter = doc.taxType === 'inter' || (doc.igstTotal > 0)
      const cgst = doc.cgstTotal || (isInter ? 0 : (doc.taxTotal || 0) / 2)
      const sgst = doc.sgstTotal || (isInter ? 0 : (doc.taxTotal || 0) / 2)
      const igst = doc.igstTotal || (isInter ? (doc.taxTotal || 0) : 0)

      const boxH = isInter ? 86 : 100
      const tbx = L + CW - 230
      pdf.rect(tbx, y, 230, boxH).stroke(LINE)
      let ty = y + 10
      pdf.font('Regular').fontSize(9).fillColor(MUTED).text('Subtotal', tbx + 12, ty)
      pdf.font('Regular').fontSize(9).fillColor(TEXT).text(fmt(doc.subtotal), tbx + 12, ty, { width: 206, align: 'right' })
      ty += 14
      if (isInter) {
        pdf.font('Regular').fontSize(9).fillColor(MUTED).text('IGST', tbx + 12, ty)
        pdf.font('Regular').fontSize(9).fillColor(TEXT).text(fmt(igst), tbx + 12, ty, { width: 206, align: 'right' })
        ty += 14
      } else {
        pdf.font('Regular').fontSize(9).fillColor(MUTED).text('CGST', tbx + 12, ty)
        pdf.font('Regular').fontSize(9).fillColor(TEXT).text(fmt(cgst), tbx + 12, ty, { width: 206, align: 'right' })
        ty += 14
        pdf.font('Regular').fontSize(9).fillColor(MUTED).text('SGST', tbx + 12, ty)
        pdf.font('Regular').fontSize(9).fillColor(TEXT).text(fmt(sgst), tbx + 12, ty, { width: 206, align: 'right' })
        ty += 14
      }
      pdf.moveTo(tbx + 10, ty + 4).lineTo(tbx + 220, ty + 4).stroke(LINE)
      ty += 10
      pdf.font('Bold').fontSize(11).fillColor(ACCENT).text('Total', tbx + 12, ty)
      pdf.font('Bold').fontSize(11).fillColor(ACCENT).text(fmt(doc.total), tbx + 12, ty, { width: 206, align: 'right' })
      y += boxH + 12

      // ── Notes / Terms ──
      if (doc.notes) {
        pdf.font('Bold').fontSize(9).fillColor(TEXT).text('Notes', L, y); y += 12
        pdf.font('Regular').fontSize(8).fillColor(MUTED).text(doc.notes, L, y, { width: CW }); y += 30
      }
      if (doc.terms) {
        pdf.font('Bold').fontSize(9).fillColor(TEXT).text('Terms', L, y); y += 12
        pdf.font('Regular').fontSize(8).fillColor(MUTED).text(doc.terms, L, y, { width: CW }); y += 30
      }

      // ── Footer ──
      pdf.font('Regular').fontSize(7.5).fillColor('#999')
        .text((cfg.footerText || '').replace(/invoice/gi, (doc.title || 'document').toLowerCase()) || `This is a computer-generated ${(doc.title || 'document').toLowerCase()}.`, L, 800, { width: CW, align: 'center' })

      pdf.end()
    } catch (e) { reject(e) }
  })
}
