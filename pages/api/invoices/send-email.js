import { connectDB } from '../../../lib/mongodb'
import Invoice from '../../../models/Invoice'
import OrgConfig from '../../../models/OrgConfig'
import nodemailer from 'nodemailer'
import PDFDocument from 'pdfkit'

function fillTemplate(template, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, 'g'), v || ''), template)
}

function fmtMoney(n, sym = 'INR ') {
  return sym + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

async function generatePDF(inv, cfg) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
      const chunks = []
      doc.on('data', c => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Use built-in Helvetica fonts
      doc.registerFont('Regular', 'Helvetica')
      doc.registerFont('Bold', 'Helvetica-Bold')

      const W = doc.page.width
      const ACCENT = '#6366F1'
      const ACCENT_LIGHT = '#EEF2FF'
      const TEXT = '#1a1a1a'
      const MUTED = '#666666'
      const FAINT = '#999999'
      const LINE = '#DDD6FE'
      const L = 40  // left margin
      const R = W - 40 // right edge
      const CW = W - 80 // content width
      let y = 40

      // ── LOGO ──────────────────────────────────────────────────────────────
      const logoB64 = cfg.logoUrl || ''
      if (logoB64 && logoB64.startsWith('data:image')) {
        try {
          const parts = logoB64.split(',')
          const buf = Buffer.from(parts[1], 'base64')
          doc.image(buf, L, y, { fit: [120, 40], align: 'left' })
        } catch {}
      }

      // ── INVOICE title (right side) ──────────────────────────────────────
      doc.font('Bold').fontSize(22).fillColor(ACCENT)
        .text('INVOICE', L, y, { align: 'right', width: CW })
      doc.font('Regular').fontSize(10).fillColor(MUTED)
        .text(inv.invoiceNumber || '', L, y + 26, { align: 'right', width: CW })
      doc.font('Regular').fontSize(9).fillColor('#185FA5')
        .text((inv.status || '').toUpperCase(), L, y + 40, { align: 'right', width: CW })
      y += 56

      // ── Accent line ─────────────────────────────────────────────────────
      doc.moveTo(L, y).lineTo(R, y).lineWidth(2).strokeColor(ACCENT).stroke()
      y += 6

      // ── Business info ───────────────────────────────────────────────────
      const bizParts = [cfg.businessName, cfg.businessAddress, cfg.businessEmail, cfg.businessPhone, cfg.gstin ? `GST: ${cfg.gstin}` : ''].filter(Boolean)
      doc.font('Regular').fontSize(8).fillColor(MUTED)
        .text(bizParts.join('  ·  '), L, y, { width: CW })
      y += 18

      // ── BILL TO / INVOICE DETAILS ─────────────────────────────────────
      const colMid = L + CW / 2 + 4
      const colW2 = CW / 2 - 4

      // Left box
      doc.rect(L, y, colW2, 72).fillAndStroke(ACCENT_LIGHT, LINE)
      let ly = y + 6
      doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('BILL TO', L + 8, ly)
      ly += 12
      doc.font('Bold').fontSize(10).fillColor(TEXT).text(inv.customer?.name || '', L + 8, ly, { width: colW2 - 12 })
      ly += 13
      doc.font('Regular').fontSize(8).fillColor(MUTED)
      if (inv.customer?.email)   { doc.text(inv.customer.email,   L + 8, ly, { width: colW2 - 12 }); ly += 10 }
      if (inv.customer?.address) { doc.text(inv.customer.address, L + 8, ly, { width: colW2 - 12 }); ly += 10 }
      if (inv.customer?.gstin)   { doc.text(`GSTIN: ${inv.customer.gstin}`, L + 8, ly, { width: colW2 - 12 }); ly += 10 }

      // Right box
      doc.rect(colMid, y, colW2, 72).fillAndStroke('#F5F3FF', LINE)
      let ry = y + 6
      doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('INVOICE DETAILS', colMid + 8, ry)
      ry += 12
      doc.font('Regular').fontSize(8.5).fillColor(TEXT)
      const details = [
        ['Invoice #', inv.invoiceNumber],
        ['Issue Date', fmtDate(inv.issueDate)],
        ['Due Date', fmtDate(inv.dueDate)],
        ['Currency', inv.currency || 'INR'],
      ]
      for (const [lbl, val] of details) {
        doc.font('Regular').fillColor(MUTED).text(lbl + ':', colMid + 8, ry, { continued: false, width: colW2 - 12 })
        doc.font('Bold').fillColor(TEXT).text(val || '', colMid + 70, ry, { width: colW2 - 70 })
        ry += 11
      }

      y += 80

      // ── LINE ITEMS TABLE ──────────────────────────────────────────────
      // colWidths must sum to CW (page width - margins = 515)
      const colWidths = [22, 213, 50, 85, 45, 100]  // total = 515
      const headers = ['#', 'Description', 'Qty', 'Rate', 'Tax', 'Amount']
      const aligns = ['center', 'left', 'right', 'right', 'center', 'right']
      const lineH = 22
      const padL = 5

      // Header row
      doc.rect(L, y, CW, lineH).fill(ACCENT)
      let cx = L
      for (let i = 0; i < headers.length; i++) {
        const cw = colWidths[i]
        doc.font('Bold').fontSize(8).fillColor('white')
          .text(headers[i], cx + padL, y + 6, { width: cw - padL * 2, align: aligns[i] })
        cx += cw
      }
      y += lineH

      // Data rows
      const sym = inv.currency === 'INR' ? 'INR ' : ((inv.currency || 'INR') + ' ')
      let subtotal = 0, taxTotal = 0
      const items = inv.lineItems || []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const qty  = parseFloat(item.qty  || 0)
        const rate = parseFloat(item.rate || 0)
        const tax  = parseFloat(item.tax  || 0)
        const base = qty * rate
        const txv  = base * tax / 100
        const amt  = base + txv
        subtotal  += base
        taxTotal  += txv
        const bg = i % 2 === 0 ? ACCENT_LIGHT : '#ffffff'
        doc.rect(L, y, CW, lineH).fill(bg)
        const cells = [
          String(i + 1),
          item.description || '',
          String(qty % 1 === 0 ? qty : qty.toFixed(2)),
          fmtMoney(rate, sym),
          `${Math.round(tax)}%`,
          fmtMoney(amt, sym),
        ]
        cx = L
        for (let j = 0; j < cells.length; j++) {
          doc.font(j === 5 ? 'Bold' : 'Regular').fontSize(8.5).fillColor(TEXT)
            .text(cells[j], cx + padL, y + 6, { width: colWidths[j] - padL * 2, align: aligns[j] })
          cx += colWidths[j]
        }
        doc.rect(L, y, CW, lineH).stroke(LINE)
        y += lineH
      }

      // ── TOTALS ────────────────────────────────────────────────────────────
      const grand = subtotal + taxTotal
      const paid  = parseFloat(inv.paidAmount || 0)
      const balance = grand - paid
      y += 4
      // Totals — fixed right-side block, label 90px, value 110px
      const totW = 200
      const totX = R - totW
      const lblW = 90
      const valW = totW - lblW
      const totRows = [
        ['Subtotal',   fmtMoney(subtotal, sym), false],
        ['Tax (GST)',  fmtMoney(taxTotal, sym),  false],
        ...(paid > 0 ? [['Paid', fmtMoney(paid, sym), false]] : []),
        ['Balance Due', fmtMoney(balance, sym), true],
      ]
      y += 4
      for (const [lbl, val, bold] of totRows) {
        if (bold) {
          doc.moveTo(totX, y).lineTo(R, y).lineWidth(1).strokeColor(ACCENT).stroke()
          y += 5
        }
        doc.font('Regular').fontSize(bold ? 10 : 9)
          .fillColor(bold ? ACCENT : (lbl === 'Paid' ? '#3B6D11' : MUTED))
          .text(lbl, totX, y, { width: lblW, align: 'left' })
        doc.font(bold ? 'Bold' : 'Regular').fontSize(bold ? 10 : 9)
          .fillColor(bold ? ACCENT : TEXT)
          .text(val, totX + lblW, y, { width: valW, align: 'right' })
        y += bold ? 16 : 13
      }
      y += 10

      // ── BANK DETAILS ──────────────────────────────────────────────────────
      const bankFields = [
        ['Bank', cfg.bankName], ['Account Name', cfg.accountName],
        ['Account No.', cfg.accountNumber], ['IFSC', cfg.ifscCode],
        ['Branch', cfg.bankBranch], ['UPI', cfg.upiId],
      ].filter(([, v]) => v)
      if (bankFields.length) {
        const bh = 14 + bankFields.length * 12
        doc.rect(L, y, CW / 2 - 4, bh).fillAndStroke(ACCENT_LIGHT, LINE)
        doc.font('Bold').fontSize(7.5).fillColor(ACCENT).text('BANK DETAILS', L + 8, y + 6)
        let by = y + 18
        for (const [lbl, val] of bankFields) {
          doc.font('Regular').fontSize(8).fillColor(MUTED).text(lbl + ':', L + 8, by, { continued: false })
          doc.font('Bold').fontSize(8).fillColor(TEXT).text(val, L + 80, by, { width: CW / 2 - 100 })
          by += 12
        }
        y += bh + 6
      }

      // ── NOTES & TERMS ─────────────────────────────────────────────────────
      const notes = inv.notes || ''
      const terms = inv.terms || ''
      if (notes || terms) {
        const half = CW / 2 - 4
        if (notes) {
          doc.rect(L, y, half, 40).fillAndStroke('#FFFBF0', '#F59E0B')
          doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('NOTES', L + 8, y + 5)
          doc.font('Regular').fontSize(8).fillColor(MUTED).text(notes, L + 8, y + 16, { width: half - 16 })
        }
        if (terms) {
          const tx = notes ? L + half + 8 : L
          doc.rect(tx, y, half, 40).fillAndStroke('#F5F3FF', LINE)
          doc.font('Bold').fontSize(7.5).fillColor(FAINT).text('TERMS & CONDITIONS', tx + 8, y + 5)
          doc.font('Regular').fontSize(8).fillColor(MUTED).text(terms, tx + 8, y + 16, { width: half - 16 })
        }
        y += 48
      }

      // ── SIGNATURE ─────────────────────────────────────────────────────────
      const sigName  = cfg.signatureName || ''
      const sigTitle = cfg.signatureTitle || ''
      const sigImg   = cfg.signatureImage || ''
      if (sigName || sigImg) {
        const sigX = R - 160
        doc.font('Regular').fontSize(8).fillColor(FAINT).text(`For ${cfg.businessName || ''}`, sigX, y + 4, { width: 160, align: 'center' })
        y += 16
        if (sigImg && sigImg.startsWith('data:image')) {
          try {
            const buf = Buffer.from(sigImg.split(',')[1], 'base64')
            doc.image(buf, sigX + 20, y, { fit: [120, 36], align: 'center' })
            y += 40
          } catch { y += 20 }
        } else {
          doc.moveTo(sigX + 10, y + 20).lineTo(R - 10, y + 20).lineWidth(0.5).strokeColor(LINE).stroke()
          y += 26
        }
        if (sigName)  { doc.font('Bold').fontSize(9).fillColor(TEXT).text(sigName, sigX, y, { width: 160, align: 'center' }); y += 11 }
        if (sigTitle) { doc.font('Regular').fontSize(8).fillColor(MUTED).text(sigTitle, sigX, y, { width: 160, align: 'center' }); y += 11 }
        doc.font('Regular').fontSize(8).fillColor(FAINT).text('Authorized Signatory', sigX, y, { width: 160, align: 'center' })
        y += 20
      }

      // ── FOOTER ────────────────────────────────────────────────────────────
      doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor(LINE).stroke()
      y += 5
      const footerText = cfg.footerText || 'This is a computer-generated invoice.'
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      doc.font('Regular').fontSize(7.5).fillColor(FAINT)
        .text(footerText, L, y, { width: CW / 2 })
      doc.font('Regular').fontSize(7.5).fillColor(FAINT)
        .text(`${cfg.businessName || ''}  ·  ${dateStr}`, L, y, { width: CW, align: 'right' })

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()

  const orgId = req.headers['x-org-id'] || 'default'
  const { invoiceId, to, subject, body, cc } = req.body

  if (!invoiceId || !to) return res.status(400).json({ error: 'invoiceId and to are required' })

  const [invoice, cfg] = await Promise.all([
    Invoice.findById(invoiceId),
    OrgConfig.findOne({ orgId }),
  ])

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  const smtpHost = cfg?.smtpHost || process.env.SMTP_HOST
  const smtpUser = cfg?.smtpUser || process.env.SMTP_USER
  const smtpPass = cfg?.smtpPass || process.env.SMTP_PASS
  const smtpPort = cfg?.smtpPort || process.env.SMTP_PORT || 587
  const smtpFrom = cfg?.smtpFrom || process.env.SMTP_FROM || smtpUser

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Email not configured', message: 'Configure SMTP in Configuration → Email tab.' })
  }

  const cfgObj = cfg ? (cfg.toObject ? cfg.toObject() : cfg) : {}
  const invObj = invoice.toObject ? invoice.toObject() : invoice

  const dueDate = invoice.dueDate ? fmtDate(invoice.dueDate) : ''

  const vars = {
    invoiceNumber: invoice.invoiceNumber,
    businessName:  cfgObj.businessName || 'Synergific',
    customerName:  invoice.customer?.name || 'Customer',
    amount:        fmtMoney(invoice.total),
    dueDate,
    notes:         invoice.notes || '',
    terms:         invoice.terms || '',
  }

  const finalSubject = fillTemplate(subject || cfgObj.emailSubject || 'Invoice {{invoiceNumber}} from {{businessName}}', vars)
  const finalBody    = fillTemplate(body    || cfgObj.emailBody    || 'Please find attached invoice {{invoiceNumber}} for {{amount}}.', vars)

  // Generate PDF
  let pdfBuffer = null
  try {
    pdfBuffer = await generatePDF(invObj, cfgObj)
  } catch (e) {
    console.error('[pdf error]', e.message)
  }

  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d || '' }
  }

  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:24px 28px">
    ${cfgObj.logoUrl ? `<img src="${cfgObj.logoUrl}" style="height:32px;object-fit:contain;display:block;margin-bottom:12px"/>` : ''}
    <div style="color:rgba(255,255,255,0.8);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Invoice from ${cfgObj.businessName || ''}</div>
    <div style="color:#fff;font-size:22px;font-weight:700">${invoice.invoiceNumber}</div>
    <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:3px">
      Amount Due: <strong style="color:#fff">${fmtMoney(invoice.total)}</strong>
      ${dueDate ? `&nbsp;·&nbsp; Due: <strong style="color:#fff">${dueDate}</strong>` : ''}
    </div>
  </div>
  <div style="padding:24px 28px">
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7">${finalBody.replace(/\n/g, '<br>')}</p>
    ${pdfBuffer
      ? '<p style="font-size:13px;color:#6B7280;margin:0">📎 Invoice PDF is attached to this email.</p>'
      : '<p style="font-size:13px;color:#e53e3e;margin:0">⚠ PDF could not be generated. Please contact support.</p>'}
  </div>
  <div style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <div style="font-size:12px;color:#9CA3AF">${cfgObj.businessName || ''} &middot; ${cfgObj.businessEmail || ''}</div>
    <div style="font-size:11px;color:#D1D5DB;margin-top:2px">${cfgObj.footerText || 'This is a computer-generated invoice.'}</div>
  </div>
</div>
</body></html>`

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost, port: Number(smtpPort),
      secure: cfg?.smtpSecure || smtpPort == 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: smtpFrom, to, cc: cc || undefined,
      subject: finalSubject,
      text: finalBody,
      html: emailHtml,
      attachments: pdfBuffer ? [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : [],
    })

    if (['Draft', 'Due'].includes(invoice.status)) {
      await Invoice.findByIdAndUpdate(invoiceId, { status: 'Sent' })
    }

    return res.status(200).json({ success: true, message: `Invoice sent to ${to}${pdfBuffer ? ' with PDF' : ''}` })
  } catch (e) {
    return res.status(500).json({ error: `Email failed: ${e.message}` })
  }
}