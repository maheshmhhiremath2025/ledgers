// Generates public/user-guide.pdf — a branded end-user guide for HexaLabs Books.
// Run:  node scripts/build-user-guide.js
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const OUT      = path.join(__dirname, '..', 'public', 'user-guide.pdf')
const LOGO     = path.join(__dirname, '..', 'public', 'logo.png')

const COLORS = {
  accent:   '#6366F1',
  accent2:  '#8B5CF6',
  accent3:  '#06B6D4',
  text:     '#0B1020',
  text2:    '#3B4252',
  text3:    '#6B7280',
  text4:    '#9CA3AF',
  border:   '#E5E7EB',
  border2:  '#F1F2F6',
  bgLight:  '#FAFBFF',
  bgSoft:   '#F4F5FB',
  bgAccent: '#EEF0FE',
  green:    '#10B981',
  red:      '#EF4444',
  amber:    '#F59E0B',
  pink:     '#EC4899',
  white:    '#FFFFFF',
}

// Premium section palette — each chapter gets its own color pair
// [primary, soft-tint bg]
const PALETTE = [
  ['#6366F1', '#EEF0FE'],   // indigo
  ['#8B5CF6', '#F3EEFE'],   // violet
  ['#EC4899', '#FDEEF5'],   // pink
  ['#EF4444', '#FEEEEE'],   // red
  ['#F59E0B', '#FEF6E7'],   // amber
  ['#10B981', '#E7FAF3'],   // emerald
  ['#06B6D4', '#E5FAFE'],   // cyan
  ['#3B82F6', '#EBF2FE'],   // blue
]

// Current chapter color — mutated by h1()
let CURRENT = { main: PALETTE[0][0], tint: PALETTE[0][1] }
let chapterIndex = 0

// A4 margins leave room for header (top) and footer (bottom)
const HEADER_H = 52
const FOOTER_H = 46

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 72 + HEADER_H, bottom: 54 + FOOTER_H, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title:    'HexaLabs Books — User Guide',
    Author:   'HexaLabs',
    Subject:  'Complete user guide for HexaLabs Books accounting software',
    Keywords: 'hexalabs books, user guide, gst invoicing, accounting',
  },
})

const out = fs.createWriteStream(OUT)
doc.pipe(out)

const PAGE_W = doc.page.width
const PAGE_H = doc.page.height
const M = 56
const CONTENT_W = PAGE_W - M * 2
const CONTENT_TOP = 72 + HEADER_H
const CONTENT_BOTTOM = PAGE_H - 54 - FOOTER_H

// ───── Layout helpers ─────

// Each chapter starts on a new page with a big colored chapter block.
// Parses "6. Creating Invoices" → number "06", title "Creating Invoices".
function h1(raw) {
  // Always start a new page for a new chapter so the visual block stands out.
  doc.addPage()

  // Rotate palette color per chapter (premium multi-color look)
  const [main, tint] = PALETTE[chapterIndex % PALETTE.length]
  CURRENT = { main, tint }
  chapterIndex++

  const m = raw.match(/^(\d+)\.\s+(.*)$/)
  const num   = m ? m[1].padStart(2, '0') : ''
  const title = m ? m[2] : raw

  const y0 = doc.y

  // Soft rounded tinted block
  doc.save()
  doc.roundedRect(M, y0, CONTENT_W, 92, 14).fill(tint)
  // Accent left bar
  doc.roundedRect(M, y0, 6, 92, 3).fill(main)
  doc.restore()

  // Small "CHAPTER" eyebrow
  doc.fillColor(main).font('Helvetica-Bold').fontSize(9)
     .text('CHAPTER', M + 24, y0 + 18, { characterSpacing: 2, lineBreak: false })

  // Big ghosted chapter number on the right
  doc.save()
  doc.fillOpacity(0.18)
  doc.fillColor(main).font('Helvetica-Bold').fontSize(78)
     .text(num, M, y0 + 4, { width: CONTENT_W - 20, align: 'right', lineBreak: false })
  doc.fillOpacity(1)
  doc.restore()

  // Title
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(24)
     .text(title, M + 24, y0 + 38, { width: CONTENT_W - 140, lineBreak: false, ellipsis: true })

  // Thin accent underline beneath title
  doc.save()
  doc.strokeColor(main).lineWidth(2)
     .moveTo(M + 24, y0 + 76).lineTo(M + 64, y0 + 76).stroke()
  doc.restore()

  doc.y = y0 + 92 + 18
}

function h2(text) {
  if (doc.y > CONTENT_BOTTOM - 100) doc.addPage()
  doc.moveDown(0.6)
  const y0 = doc.y
  // Small colored square marker
  doc.save()
  doc.roundedRect(M, y0 + 6, 4, 14, 1).fill(CURRENT.main)
  doc.restore()
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(13.5)
     .text(text, M + 12, y0, { width: CONTENT_W - 12 })
  doc.moveDown(0.35)
}

function h3(text) {
  if (doc.y > CONTENT_BOTTOM - 80) doc.addPage()
  doc.moveDown(0.35)
  // Eyebrow style — uppercase tracked
  doc.fillColor(CURRENT.main).font('Helvetica-Bold').fontSize(9.5)
     .text(text.toUpperCase(), { characterSpacing: 1.2 })
  doc.moveDown(0.15)
}

function p(text, opts = {}) {
  doc.fillColor(COLORS.text2).font('Helvetica').fontSize(10.5)
     .text(text, { align: 'justify', lineGap: 2, ...opts })
  doc.moveDown(0.4)
}

function bullet(items) {
  doc.font('Helvetica').fontSize(10.5)
  items.forEach(item => {
    if (doc.y > CONTENT_BOTTOM - 40) doc.addPage()
    const y0 = doc.y
    // square marker in current chapter color
    doc.save()
    doc.roundedRect(M + 2, y0 + 5, 5, 5, 1).fill(CURRENT.main)
    doc.restore()
    doc.fillColor(COLORS.text2)
       .text(item, M + 16, y0, { width: CONTENT_W - 16, lineGap: 2.5 })
    doc.moveDown(0.1)
  })
  doc.moveDown(0.3)
}

function numbered(items) {
  doc.font('Helvetica').fontSize(10.5)
  items.forEach((item, i) => {
    if (doc.y > CONTENT_BOTTOM - 50) doc.addPage()
    const y0 = doc.y
    // Rounded square number chip
    doc.save()
    doc.roundedRect(M, y0, 18, 18, 4).fill(CURRENT.tint)
    doc.fillColor(CURRENT.main).font('Helvetica-Bold').fontSize(10)
       .text(String(i + 1), M, y0 + 4, { width: 18, align: 'center', lineBreak: false })
    doc.restore()
    doc.fillColor(COLORS.text2).font('Helvetica').fontSize(10.5)
       .text(item, M + 26, y0 + 2, { width: CONTENT_W - 26, lineGap: 2.5 })
    doc.moveDown(0.2)
  })
  doc.moveDown(0.3)
}

function callout(label, body, variant = 'info') {
  const COLOR_MAP = {
    info:    { main: '#6366F1', tint: '#EEF0FE', icon: 'i' },
    warning: { main: '#F59E0B', tint: '#FEF6E7', icon: '!' },
    danger:  { main: '#EF4444', tint: '#FEEEEE', icon: '!' },
    success: { main: '#10B981', tint: '#E7FAF3', icon: '✓' },
  }
  const v = COLOR_MAP[variant] || COLOR_MAP.info

  if (doc.y > CONTENT_BOTTOM - 120) doc.addPage()
  const y0 = doc.y
  const padY = 14, padX = 16, iconW = 30
  doc.save()
  doc.font('Helvetica').fontSize(10)
  const bodyH = doc.heightOfString(body, { width: CONTENT_W - padX * 2 - iconW - 6 })
  const labelH = 14
  const h = labelH + bodyH + padY * 2 + 4

  // Tinted background card
  doc.roundedRect(M, y0, CONTENT_W, h, 10).fill(v.tint)
  // Left icon chip
  doc.roundedRect(M + padX, y0 + padY, 22, 22, 6).fill(v.main)
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(12)
     .text(v.icon, M + padX, y0 + padY + 5, { width: 22, align: 'center', lineBreak: false })

  doc.fillColor(v.main).font('Helvetica-Bold').fontSize(9.5)
     .text(label.toUpperCase(), M + padX + iconW, y0 + padY + 1, { width: CONTENT_W - padX * 2 - iconW, characterSpacing: 1.5 })
  doc.fillColor(COLORS.text2).font('Helvetica').fontSize(10)
     .text(body, M + padX + iconW, y0 + padY + labelH + 2, { width: CONTENT_W - padX * 2 - iconW, lineGap: 2 })
  doc.restore()
  doc.y = y0 + h + 12
}

function kvTable(rows) {
  const rowH = 26
  const col1W = 160
  // Outer rounded card
  if (doc.y > CONTENT_BOTTOM - rows.length * (rowH + 2) - 20) doc.addPage()
  const y0Block = doc.y
  const totalH = rows.length * (rowH + 2) + 8
  doc.save()
  doc.roundedRect(M, y0Block, CONTENT_W, totalH, 8).lineWidth(1).strokeColor(COLORS.border2).stroke()
  doc.restore()
  doc.y = y0Block + 4
  rows.forEach((r, i) => {
    const y0 = doc.y
    doc.save()
    if (i % 2 === 0) {
      doc.roundedRect(M + 4, y0, CONTENT_W - 8, rowH, 5).fill(CURRENT.tint)
    }
    doc.fillColor(CURRENT.main).font('Helvetica-Bold').fontSize(10)
       .text(r[0], M + 16, y0 + 8, { width: col1W - 16, lineBreak: false })
    doc.fillColor(COLORS.text2).font('Helvetica').fontSize(10)
       .text(r[1], M + col1W, y0 + 8, { width: CONTENT_W - col1W - 16, lineBreak: false, ellipsis: true })
    doc.restore()
    doc.y = y0 + rowH + 2
  })
  doc.y = y0Block + totalH + 8
}

// ═══════════════════════════════════════════════════════════
// COVER PAGE — premium editorial layout
// ═══════════════════════════════════════════════════════════

// Clean off-white background
doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLORS.bgLight)

// Bold color block top-left (indigo)
doc.rect(0, 0, PAGE_W * 0.62, 300).fill('#6366F1')
// Accent trapezoid bottom-right (pink)
doc.save()
doc.polygon([PAGE_W, 300], [PAGE_W, 0], [PAGE_W * 0.62, 0], [PAGE_W * 0.62, 300]).fill('#8B5CF6')
doc.restore()
// Small cyan stripe
doc.rect(0, 300, PAGE_W, 6).fill('#06B6D4')

// Logo — white chip, top-left
const logoSize = 54
try {
  doc.image(LOGO, M, 50, { fit: [logoSize, logoSize] })
} catch {}

// "USER GUIDE" eyebrow on cover
doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica-Bold').fontSize(10)
   .text('THE COMPLETE', M, 180, { characterSpacing: 3, lineBreak: false })
doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11)
   .text('USER GUIDE', M, 196, { characterSpacing: 3, lineBreak: false })

// Huge serif-ish display title
doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(54)
   .text('HexaLabs', M, 224, { characterSpacing: -1.5, lineBreak: false })
doc.fillColor('rgba(255,255,255,0.92)').font('Helvetica-Bold').fontSize(54)
   .text('Books.', M, 258, { characterSpacing: -1.5, lineBreak: false })

// ── Middle / content section ──
const midY = 370

// Three horizontal color bars as dividers
const barY = midY
const bars = [
  { x: M,         w: 40, c: '#6366F1' },
  { x: M + 48,    w: 20, c: '#8B5CF6' },
  { x: M + 72,    w: 10, c: '#EC4899' },
]
bars.forEach(b => doc.rect(b.x, barY, b.w, 3).fill(b.c))

// Eyebrow
doc.fillColor(COLORS.text3).font('Helvetica-Bold').fontSize(9)
   .text('ABOUT THIS GUIDE', M, barY + 16, { characterSpacing: 2 })

// Description
doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(16)
   .text('Everything you need to run your business.',
         M, barY + 36, { width: CONTENT_W, lineGap: 2 })

doc.fillColor(COLORS.text2).font('Helvetica').fontSize(11)
   .text(
     'This guide walks you through every feature of HexaLabs Books — from signing up to creating your first invoice, managing expenses, generating reports, and using advanced features like webhooks, API keys and time tracking.',
     M, barY + 86, { width: CONTENT_W - 20, align: 'justify', lineGap: 3.5 }
   )

// ── Highlights row (3 colored cards) ──
const cardsY = 540
const cardW  = (CONTENT_W - 20) / 3
const highlights = [
  { label: 'CHAPTERS',  value: '25',  color: '#6366F1' },
  { label: 'FEATURES',  value: '50+', color: '#EC4899' },
  { label: 'READING',   value: '45m', color: '#10B981' },
]
highlights.forEach((h, i) => {
  const x = M + i * (cardW + 10)
  doc.save()
  doc.roundedRect(x, cardsY, cardW, 74, 10).fill(COLORS.white)
  doc.roundedRect(x, cardsY, cardW, 74, 10).lineWidth(1).strokeColor(COLORS.border).stroke()
  // Top colored tab
  doc.roundedRect(x, cardsY, cardW, 4, 2).fill(h.color)
  doc.fillColor(h.color).font('Helvetica-Bold').fontSize(28)
     .text(h.value, x, cardsY + 14, { width: cardW, align: 'center', lineBreak: false })
  doc.fillColor(COLORS.text3).font('Helvetica-Bold').fontSize(9)
     .text(h.label, x, cardsY + 50, { width: cardW, align: 'center', characterSpacing: 1.5, lineBreak: false })
  doc.restore()
})

// ── Bottom bar ──
doc.rect(0, PAGE_H - 64, PAGE_W, 64).fill(COLORS.text)
// colored underline stripe
doc.rect(0, PAGE_H - 64, PAGE_W, 3).fill('#6366F1')
doc.rect(PAGE_W / 3, PAGE_H - 64, PAGE_W / 3, 3).fill('#EC4899')
doc.rect((PAGE_W * 2) / 3, PAGE_H - 64, PAGE_W / 3, 3).fill('#10B981')

doc.fillColor('rgba(255,255,255,0.55)').font('Helvetica').fontSize(9)
   .text('VERSION 1.0   ·   ' + new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase(),
         M, PAGE_H - 42, { characterSpacing: 1.5, lineBreak: false })
doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(10)
   .text('ledgers.hexalabs.online',
         M, PAGE_H - 42, { width: CONTENT_W, align: 'right', lineBreak: false, link: 'https://ledgers.hexalabs.online' })

// ═══════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════
doc.addPage()

// Custom TOC header — don't use h1() so we don't advance chapter palette
{
  const y0 = doc.y
  doc.save()
  doc.roundedRect(M, y0, CONTENT_W, 78, 12).fill(COLORS.bgSoft)
  doc.roundedRect(M, y0, 6, 78, 3).fill('#6366F1')
  doc.restore()
  doc.fillColor('#6366F1').font('Helvetica-Bold').fontSize(9)
     .text('INDEX', M + 24, y0 + 20, { characterSpacing: 2, lineBreak: false })
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(28)
     .text('Table of Contents', M + 24, y0 + 34, { lineBreak: false })
  doc.y = y0 + 78 + 22
}

const TOC = [
  ['1.  Getting Started',                     3],
  ['2.  Dashboard Overview',                  5],
  ['3.  Setting Up Your Organisation',        6],
  ['4.  Customers & Vendors',                 8],
  ['5.  Products & Services',                 9],
  ['6.  Creating Invoices',                  10],
  ['7.  Estimates',                          13],
  ['8.  Recording Payments',                 14],
  ['9.  Purchase Orders',                    15],
  ['10. Vendor Bills',                       16],
  ['11. Expenses',                           17],
  ['12. Recurring Invoices & Expenses',      18],
  ['13. Bank Accounts',                      19],
  ['14. Financial Reports',                  20],
  ['15. GST & Tax',                          22],
  ['16. Projects & Time Tracking',           23],
  ['17. Fixed Assets',                       24],
  ['18. Bulk CSV Import',                    25],
  ['19. File Attachments',                   26],
  ['20. Team Members & Roles',               26],
  ['21. Two-Factor Authentication',          27],
  ['22. API Keys & Webhooks',                28],
  ['23. Audit Log',                          30],
  ['24. Billing & Renewals',                 30],
  ['25. Troubleshooting & Support',          31],
]

TOC.forEach(([label, page], i) => {
  if (doc.y > CONTENT_BOTTOM - 34) doc.addPage()
  const y0 = doc.y
  const [main, tint] = PALETTE[i % PALETTE.length]

  // Extract chapter number
  const numMatch = label.match(/^(\d+)\.\s+(.*)$/)
  const num   = numMatch ? numMatch[1].padStart(2, '0') : ''
  const title = numMatch ? numMatch[2] : label

  // Colored chapter number chip
  doc.save()
  doc.roundedRect(M, y0, 32, 24, 5).fill(tint)
  doc.fillColor(main).font('Helvetica-Bold').fontSize(11)
     .text(num, M, y0 + 6, { width: 32, align: 'center', lineBreak: false })
  doc.restore()

  // Title
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(11.5)
     .text(title, M + 42, y0 + 6, { lineBreak: false })
  const titleW = doc.widthOfString(title)

  // Dotted leader
  const dotsStart = M + 42 + titleW + 10
  const dotsEnd = PAGE_W - M - 34
  doc.save()
  doc.strokeColor(COLORS.border).lineWidth(1).dash(1, { space: 3 })
     .moveTo(dotsStart, y0 + 14).lineTo(dotsEnd, y0 + 14).stroke()
  doc.undash()
  doc.restore()

  // Page number in chapter color
  doc.fillColor(main).font('Helvetica-Bold').fontSize(11)
     .text(String(page), PAGE_W - M - 28, y0 + 6, { width: 28, align: 'right', lineBreak: false })

  doc.y = y0 + 30
})

// ═══════════════════════════════════════════════════════════
// 1. GETTING STARTED
// ═══════════════════════════════════════════════════════════
h1('1. Getting Started')

p('HexaLabs Books is a complete GST-compliant invoicing and accounting platform built for Indian freelancers and small businesses. You can create invoices, accept online payments, track expenses, generate financial reports and manage your entire books from one place — in your web browser, on any device.')

h2('Creating your account')
numbered([
  'Visit https://ledgers.hexalabs.online and click "Get started free".',
  'Enter your name, business email address and a strong password.',
  'You will be logged in immediately on the free Starter plan — no credit card required.',
  'On first login, you will see an onboarding checklist on the dashboard. Follow it to set up your organisation, add your first customer, and send your first invoice.',
])

h2('Logging in')
p('Return visits: open https://ledgers.hexalabs.online/app and enter your email and password. If you forget your password, click "Forgot password" on the login screen — you will receive a reset link by email that is valid for 1 hour.')

callout('Tip', 'Bookmark https://ledgers.hexalabs.online/app for quick access to your books. On mobile you can "Add to Home Screen" from your browser menu to use HexaLabs Books like a native app.', 'info')

h2('The onboarding checklist')
p('When you first sign in, a checklist appears at the top of your dashboard showing 5 essential setup steps:')
bullet([
  'Set up your organisation (business name, GSTIN, address)',
  'Upload your logo — it will appear on every invoice',
  'Add your first customer',
  'Add a bank account — its details print on invoices for payments',
  'Create your first invoice',
])
p('As you complete each step, it is ticked off and the progress bar fills. Once all five are done, the checklist disappears. You can also dismiss it manually at any time by clicking the × in the top-right corner.')

h2('System requirements')
p('HexaLabs Books runs in any modern web browser — Chrome, Firefox, Safari, Edge. It works on desktop, tablet and mobile. No software to install. All your data is securely stored in the cloud.')

// ═══════════════════════════════════════════════════════════
// 2. DASHBOARD OVERVIEW
// ═══════════════════════════════════════════════════════════
h1('2. Dashboard Overview')

p('The dashboard is the first screen you see after logging in. It gives you a real-time snapshot of your business health at a glance.')

h2('Sections of the dashboard')
h3('Onboarding checklist')
p('Shown until you complete all five setup steps or dismiss it.')

h3('Quick Actions')
p('Six shortcut buttons for the most common tasks: New Invoice, Record Payment, Add Expense, New PO, Customers, Reports.')

h3('Key metrics (KPIs)')
p('Eight stat cards showing Financial-Year Revenue, Outstanding, Net Profit, Cash Balance, Total Invoices, Collected, AR Balance, and Total Expenses — all auto-calculated from your journal entries.')

h3('Financial overview chart')
p('A 6-month bar chart comparing Revenue, Collected and Expenses. Toggle between "Bars" view and "Cash Flow" line chart.')

h3('Due soon')
p('Lists invoices due in the next 14 days and overdue invoices, so nothing falls through the cracks.')

h3('Top customers')
p('Shows your 5 highest-paying customers for the current financial year.')

h3('Recent activity')
p('The latest invoices created and payments received so you always know what is happening.')

// ═══════════════════════════════════════════════════════════
// 3. ORGANISATION SETUP
// ═══════════════════════════════════════════════════════════
h1('3. Setting Up Your Organisation')

p('Before sending your first invoice, fill in your organisation details so everything auto-fills correctly on every document.')

h2('Where to find it')
p('Click Settings in the sidebar, then open the Organisation tab.')

h2('Fields to complete')
kvTable([
  ['Legal name',        'Your registered business name (appears on invoices)'],
  ['Trading name',      'Optional — if different from legal name'],
  ['GSTIN',             '15-character GSTIN. Used to auto-split CGST/SGST/IGST'],
  ['PAN',               '10-character PAN. Required for TDS compliance'],
  ['Address',           'Registered business address, printed on all documents'],
  ['State',             'Your state code — used for GST place-of-supply logic'],
  ['Phone / Email',     'Contact details printed on invoice headers'],
  ['Website',           'Optional — printed in invoice footer'],
  ['Currency',          'Default INR — affects invoice currency symbols'],
  ['Financial year',    'Usually April 1 in India'],
])

h2('Uploading your logo')
p('In Settings → Branding, click "Upload logo" and select a PNG or JPG (recommended: 300×100 px, under 200 KB). It will appear in the top-left of every invoice, estimate, purchase order and bill.')

h2('Uploading your signature')
p('In Settings → Branding, upload a signature image (transparent PNG recommended). It will be printed at the bottom-right of invoices and POs.')

h2('Terms & conditions')
p('In Settings → Terms, enter default payment terms, late-payment policy and notes. These auto-fill on new invoices and can be edited per-invoice as needed.')

callout('Important', 'Your GSTIN determines whether CGST + SGST (intra-state) or IGST (inter-state) is applied on every invoice. Double-check it before sending anything.', 'danger')

// ═══════════════════════════════════════════════════════════
// 4. CUSTOMERS & VENDORS
// ═══════════════════════════════════════════════════════════
h1('4. Customers & Vendors')

p('Customers are people or businesses you sell to. Vendors are people or businesses you buy from. Both work identically — you will use Customers when creating invoices and Vendors when creating purchase orders and bills.')

h2('Adding a customer')
numbered([
  'Click Customers in the sidebar, then "+ New Customer".',
  'Fill in name (required), email, phone, GSTIN, billing address, shipping address and currency.',
  'Click Save. The customer is now available on the invoice form.',
])

h2('Editing or deleting')
p('Click any customer row to open the detail page. Use the Edit button to update details, or Delete to remove. Customers who have invoices against them cannot be deleted — archive them instead.')

h2('Auto-creation from invoices')
p('If you type a new customer name directly on an invoice form without selecting an existing one, HexaLabs Books will automatically create a customer record for you when you save the invoice. No need to create customers upfront.')

h2('Vendor auto-creation from POs')
p('Same principle — when you create a purchase order for a new vendor, the vendor record is created automatically.')

h2('Bulk import')
p('To import many customers at once, use the Bulk Import feature. See Chapter 18.')

// ═══════════════════════════════════════════════════════════
// 5. PRODUCTS
// ═══════════════════════════════════════════════════════════
h1('5. Products & Services')

p('The products catalog lets you save items you sell repeatedly so you do not have to retype them on every invoice. It works for both physical goods and services.')

h2('Adding a product')
numbered([
  'Click Products in the sidebar, then "+ New Product".',
  'Enter name, SKU (optional), description, rate (unit price), default tax %, unit (piece/hour/kg), and HSN/SAC code.',
  'Click Save.',
])

h2('HSN / SAC codes')
p('Under GST, every product must have an HSN code (goods) or SAC code (services). Entering it here means it auto-fills on invoices and appears on the GSTR-1 export. You can look up codes on the GST portal.')

h2('Using products on invoices')
p('On the invoice form, click "+ Add item" and start typing — matching products appear in a dropdown. Select one and the description, rate, tax and HSN auto-fill. You can still edit any field before saving.')

// ═══════════════════════════════════════════════════════════
// 6. INVOICES
// ═══════════════════════════════════════════════════════════
h1('6. Creating Invoices')

p('Invoices are the heart of HexaLabs Books. Every invoice you create automatically posts balanced journal entries to your ledger and flows into your financial reports.')

h2('Creating a new invoice')
numbered([
  'Click Invoices in the sidebar, then "+ New Invoice".',
  'Select a customer from the dropdown (or type a new name to auto-create one).',
  'The invoice number is auto-generated in sequence. You can override it if needed.',
  'Set issue date and due date. Terms like "Net 30" can be set in Settings to auto-calculate.',
  'Add line items: click "+ Add item", type the product name or enter a custom line. Set quantity, rate and tax %.',
  'HexaLabs Books automatically calculates subtotal, CGST, SGST or IGST, and grand total.',
  'Add notes and terms in the footer if needed.',
  'Choose a PDF template (Classic, Modern, Minimal, Elegant or Corporate).',
  'Click Save (keeps it as Draft) or Save & Send (emails it to the customer immediately).',
])

h2('GST tax calculation')
p('HexaLabs Books looks at your GSTIN (supplier) and your customer\'s GSTIN (recipient). If both are in the same state, it applies CGST + SGST (each half the tax rate). If in different states, it applies IGST (full tax rate). If the customer has no GSTIN, it still applies tax based on your own state.')

callout('Example', 'You are in Karnataka (29) and send an invoice to a customer in Maharashtra (27). A ₹10,000 line with 18% tax → IGST ₹1,800. Same line to a Karnataka customer → CGST ₹900 + SGST ₹900.', 'info')

h2('Invoice statuses')
kvTable([
  ['Draft',        'Saved but not sent. Can be edited freely'],
  ['Sent',         'Emailed to customer. Still editable'],
  ['Partial',      'Some payment received, balance outstanding'],
  ['Paid',         'Fully paid — posts to Collected'],
  ['Overdue',      'Due date passed, balance still owed'],
  ['Cancelled',    'Voided — reverses journal entries'],
])

h2('Sending an invoice by email')
p('Open any saved invoice and click "Send by email". The customer receives a branded email with the PDF attached and a unique payment link. You can customise the email subject and body before sending.')

h2('The customer payment portal')
p('Every invoice generates a unique public link like https://ledgers.hexalabs.online/pay/abc123. When customers click it, they see the invoice in a clean web view and can pay instantly via UPI, credit card, debit card or net banking through Razorpay. Once paid, the invoice status updates automatically.')

h2('Editing and voiding')
p('Draft and Sent invoices can be edited. Once an invoice has payments against it, you cannot delete it — instead, void it, which reverses all journal entries cleanly.')

h2('Credit notes')
p('To refund or reverse an invoice partially, click "Create Credit Note" on the invoice detail page. Enter the amount and reason. The credit note reduces the amount owed and posts the correct journal entries.')

h2('Recurring invoices')
p('For subscription billing or monthly retainers, see Chapter 12.')

// ═══════════════════════════════════════════════════════════
// 7. ESTIMATES
// ═══════════════════════════════════════════════════════════
h1('7. Estimates')

p('Estimates (also called quotes) let you propose work to a potential customer before sending a real invoice. They have no accounting impact — nothing posts to the ledger until you convert the estimate to an invoice.')

h2('Creating an estimate')
p('Click Estimates in the sidebar, then "+ New Estimate". The form is almost identical to the invoice form — same line items, same tax logic, same PDF templates.')

h2('Estimate statuses')
kvTable([
  ['Draft',     'Saved but not sent'],
  ['Sent',      'Emailed to customer'],
  ['Accepted',  'Customer has approved'],
  ['Rejected',  'Customer declined'],
  ['Expired',   'Past its valid-until date'],
])

h2('Converting an estimate to an invoice')
p('Open an accepted estimate and click "Convert to Invoice". All line items, taxes and customer details are copied across. The estimate is marked as "Invoiced" and links to the new invoice for traceability.')

// ═══════════════════════════════════════════════════════════
// 8. PAYMENTS
// ═══════════════════════════════════════════════════════════
h1('8. Recording Payments')

p('When a customer pays you (by cash, bank transfer, cheque or online), record the payment so the invoice is marked as paid and the money flows into your books.')

h2('Ways a payment gets recorded')
bullet([
  'Customer pays via the Razorpay payment portal — automatic, no action needed',
  'You receive a bank transfer or cheque — record manually via Payments → New Payment',
  'From an open invoice, click "Record Payment"',
])

h2('Recording manually')
numbered([
  'Click Payments in the sidebar, then "+ New Payment".',
  'Select customer. Outstanding invoices appear automatically.',
  'Enter the amount received, date, payment mode (Cash, Bank, Cheque, UPI) and reference number.',
  'Choose which invoice(s) to apply the payment to. You can split one payment across multiple invoices.',
  'Click Save. Invoices are marked Paid or Partial, and journal entries post to the ledger.',
])

h2('Partial payments')
p('You can receive any amount less than the invoice total. The invoice status becomes "Partial" with the remaining balance shown. Record another payment later to close it.')

h2('Payment modes')
p('All supported modes are tracked separately in reports, so you can see how much came in by UPI versus bank transfer versus cheque. Cheque payments have an extra "Bank clearing date" field.')

// ═══════════════════════════════════════════════════════════
// 9. PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════
h1('9. Purchase Orders')

p('Purchase Orders (POs) are documents you send to vendors to request goods or services. They are tracked separately from invoices and do not post to the ledger until received or converted to a bill.')

h2('Creating a PO')
numbered([
  'Click Purchase Orders in the sidebar, then "+ New PO".',
  'Select a vendor (or type a new one to auto-create).',
  'Add line items, quantity, rate, tax.',
  'Set expected delivery date.',
  'Choose a PDF template and click Save & Send to email the vendor.',
])

h2('PO statuses')
kvTable([
  ['Draft',     'Saved but not sent'],
  ['Sent',      'Emailed to vendor'],
  ['Received',  'Goods received'],
  ['Billed',    'Converted to a vendor bill'],
  ['Closed',    'Completed or cancelled'],
])

h2('Converting a PO to a bill')
p('When the vendor sends their invoice, open the PO and click "Convert to Bill". All line items carry over — you only need to enter the vendor invoice number and date. See Chapter 10 for more on bills.')

// ═══════════════════════════════════════════════════════════
// 10. BILLS
// ═══════════════════════════════════════════════════════════
h1('10. Vendor Bills')

p('A vendor bill represents an amount you owe to a supplier. Bills post to Accounts Payable and track what you need to pay out.')

h2('Creating a bill')
numbered([
  'Click Bills in the sidebar, then "+ New Bill".',
  'Select vendor, enter their invoice number and date.',
  'Add line items and tax.',
  'Set due date for payment.',
  'Save. Accounts Payable is debited, expenses posted.',
])

h2('Paying a bill')
p('Open any unpaid bill and click "Pay Bill". Enter the amount, date and payment mode. The bill is marked Paid (or Partial) and cash flows out of your ledger.')

h2('Bill statuses')
kvTable([
  ['Open',    'Bill recorded, not yet paid'],
  ['Partial', 'Some payment made, balance owed'],
  ['Paid',    'Fully paid'],
  ['Overdue', 'Past due date'],
])

// ═══════════════════════════════════════════════════════════
// 11. EXPENSES
// ═══════════════════════════════════════════════════════════
h1('11. Expenses')

p('Expenses are day-to-day costs of running your business that do not require a formal vendor bill — things like rent, petrol, software subscriptions, stationery and meals.')

h2('Adding an expense')
numbered([
  'Click Expenses in the sidebar, then "+ New Expense".',
  'Enter date, category (Rent, Salaries, Travel, Software, etc.), amount and description.',
  'Optionally attach a receipt photo or PDF.',
  'Choose payment mode.',
  'Save. The expense posts to the ledger automatically.',
])

h2('Expense categories')
p('Default categories include Rent, Salaries, Utilities, Software, Travel, Meals, Office Supplies, Marketing, Professional Fees and Others. You can add custom categories in Settings → Expense Categories.')

h2('Monthly breakdown')
p('The dashboard shows expenses by category for the current month, and the Profit & Loss report breaks them down by category for any date range.')

// ═══════════════════════════════════════════════════════════
// 12. RECURRING
// ═══════════════════════════════════════════════════════════
h1('12. Recurring Invoices & Expenses')

p('For anything that repeats on a schedule — monthly retainers, rent, software subscriptions — set up a recurring template and HexaLabs Books generates the document automatically.')

h2('Creating a recurring invoice')
numbered([
  'Click Recurring in the sidebar, then "+ New Recurring Invoice".',
  'Select customer, add line items and tax just like a normal invoice.',
  'Set frequency: Daily, Weekly, Monthly or Yearly.',
  'Set start date and (optionally) end date.',
  'Choose whether to auto-send by email or just save as draft.',
  'Save. The first invoice generates on the start date, and subsequent ones on each scheduled date.',
])

h2('Recurring expenses')
p('Works the same way but for expenses. Click Recurring Expenses, then "+ New". Set category, amount and frequency. Useful for rent, software subscriptions, electricity and so on.')

h2('Pausing and editing')
p('Open any recurring template and click "Pause" to temporarily stop generation. Click "Edit" to change amount, frequency or line items — future invoices will use the new values.')

callout('Note', 'Recurring documents run via a daily cron job. Generated invoices appear in your Invoices list at approximately the same time each day.', 'info')

// ═══════════════════════════════════════════════════════════
// 13. BANK
// ═══════════════════════════════════════════════════════════
h1('13. Bank Accounts')

p('Add your bank accounts so their details print on every invoice for easy payment, and so you can track cash balances accurately.')

h2('Adding a bank account')
numbered([
  'Click Bank Accounts in the sidebar, then "+ New Account".',
  'Enter account name (e.g. "HDFC Current"), account number, IFSC code, bank name, branch.',
  'Set as default if this is your primary account.',
  'Save.',
])

h2('Showing on invoices')
p('The default account\'s details (name, account number, IFSC) are printed in the footer of invoice PDFs so your customers know where to transfer money.')

h2('Multiple accounts')
p('You can add as many accounts as you like. When recording a payment, choose which bank it came into. Each account has its own running balance in the ledger.')

// ═══════════════════════════════════════════════════════════
// 14. REPORTS
// ═══════════════════════════════════════════════════════════
h1('14. Financial Reports')

p('HexaLabs Books auto-generates all key financial reports from your journal entries. Nothing to configure — just open any report and set a date range.')

h2('Available reports')

h3('Profit & Loss')
p('Income minus expenses for any period. Grouped by category. Shows net profit at the bottom. Export to CSV or PDF.')

h3('Balance Sheet')
p('Assets, liabilities and equity as of any date. Must balance (assets = liabilities + equity). Useful for loan applications and year-end accounts.')

h3('Trial Balance')
p('List of every account with its debit and credit balance. Totals should match — a fundamental check for double-entry bookkeeping.')

h3('General Ledger')
p('Every journal entry for every account, drilled down to the source document. Click any line to see the underlying invoice or payment.')

h3('Account Statement')
p('Per-customer or per-vendor statement showing all invoices, payments and outstanding balance. Email directly to customers from here.')

h3('Aged Receivables')
p('Outstanding customer balances grouped by age: Current, 1–30 days, 31–60, 61–90, 90+. Helps you prioritise collections.')

h3('Aged Payables')
p('Same but for vendor bills — what you owe and for how long.')

h3('GSTR-1 Export')
p('Monthly sales data formatted for GSTR-1 filing. Exports to Excel-compatible CSV with all required columns (B2B, B2C, export, HSN summary).')

h3('GSTR-3B Summary')
p('Monthly summary of outward supplies, inward supplies and tax liability — ready to reference when filing GSTR-3B.')

h3('TDS Summary')
p('Total TDS deducted by vendors and deducted from your bills. Useful at Form 16A time.')

h2('Exporting')
p('Every report has an "Export" button. Choose CSV (for Excel or your accountant) or PDF (for sharing or printing).')

// ═══════════════════════════════════════════════════════════
// 15. GST
// ═══════════════════════════════════════════════════════════
h1('15. GST & Tax')

p('HexaLabs Books is built from the ground up for Indian GST compliance. Here is how the tax features work.')

h2('Automatic CGST/SGST/IGST split')
p('On every invoice, HexaLabs Books compares your state code (from your GSTIN) with the customer\'s state code. Same state → CGST + SGST (each half the rate). Different state → IGST (full rate). You never manually split tax.')

h2('Tax-inclusive vs tax-exclusive')
p('By default, the rate you enter on a line item is the net (pre-tax) amount. You can toggle "Tax inclusive" on the invoice form if your prices already include GST.')

h2('TDS (Tax Deducted at Source)')
p('When a customer deducts TDS from their payment to you, record the TDS rate on the invoice. When they pay you less the TDS amount, the short-payment is recorded correctly and a TDS receivable is created in the ledger.')

h2('HSN and SAC codes')
p('Enter HSN (goods) or SAC (services) codes on products so they auto-fill on invoices. These codes flow into GSTR-1 export.')

h2('e-Invoice (IRN / QR code)')
p('e-Invoice generation via the GSP is on our roadmap but not yet live. For now, HexaLabs Books generates fully GST-compliant invoices that you can use for filing manually.')

h2('Place of supply')
p('Determined automatically from the customer\'s billing state. For exports (outside India), set the customer state to "Export" and IGST applies at zero-rate.')

// ═══════════════════════════════════════════════════════════
// 16. PROJECTS
// ═══════════════════════════════════════════════════════════
h1('16. Projects & Time Tracking')

p('For consultants, agencies and freelancers who bill by the hour, Projects and Time Tracking let you log hours against a project and turn them into an invoice with one click.')

h2('Creating a project')
numbered([
  'Click Projects in the sidebar, then "+ New Project".',
  'Enter project name, customer, description, hourly rate (or leave 0 if fixed price), budget and dates.',
  'Save.',
])

h2('Logging time')
p('Open any project and click "Log Time". Enter the date, hours, a description of what you worked on, and whether the time is billable. Save.')

h2('Generating an invoice from time')
p('On the project page, the total billable-but-unbilled hours show at the top. Click "Generate Invoice" — HexaLabs Books creates a new draft invoice with one line per time entry (description + hours × rate). Review and send as normal. All included entries are marked as invoiced so they are not billed twice.')

// ═══════════════════════════════════════════════════════════
// 17. ASSETS
// ═══════════════════════════════════════════════════════════
h1('17. Fixed Assets')

p('Fixed assets are long-term things you own: laptops, furniture, vehicles, machinery. HexaLabs Books tracks their purchase cost, calculates monthly straight-line depreciation automatically, and posts depreciation entries to your ledger.')

h2('Adding a fixed asset')
numbered([
  'Click Fixed Assets in the sidebar, then "+ New Asset".',
  'Enter name, category (Equipment, Vehicle, Furniture, etc.), purchase date, cost, useful life in years, and salvage value.',
  'HexaLabs Books shows you the live monthly depreciation it will calculate.',
  'Save.',
])

h2('How depreciation works')
p('Straight-line method: (Cost minus Salvage) divided by (Useful Life in months). Example: ₹60,000 laptop with 3-year life and ₹0 salvage → ₹1,666/month depreciation for 36 months. Runs on the 1st of every month via a daily cron job and posts journal entries automatically.')

h2('Selling or retiring an asset')
p('Open the asset and click "Dispose". Enter sale date, sale value (0 if scrapped) and reason. The remaining book value is written off and any gain/loss posts to the P&L.')

// ═══════════════════════════════════════════════════════════
// 18. IMPORT
// ═══════════════════════════════════════════════════════════
h1('18. Bulk CSV Import')

p('Migrating from another tool? Use Bulk Import to upload customers, vendors or products from a CSV file in seconds.')

h2('Steps')
numbered([
  'Click Import in the sidebar.',
  'Choose what you are importing: Customers, Vendors or Products.',
  'Click "Download template" to get a pre-formatted CSV with the right columns and a sample row.',
  'Fill the template in Excel or Google Sheets. Save as CSV.',
  'Drag the file onto the upload area (or click to browse).',
  'A preview table shows the first 5 rows. Check that columns are recognised — unknown columns appear dimmed.',
  'Click "Dry run" to see how many would be created, updated or skipped without actually saving.',
  'If happy, click "Import now" to commit the changes.',
])

h2('How matching works')
p('Rows are matched to existing records by name (case-insensitive). If a match is found, HexaLabs Books only fills in blank fields — it never overwrites your existing data. Unmatched rows are created as new.')

h2('Errors')
p('If any rows fail (missing required field, invalid GSTIN format, etc.), the results show each error with its line number and reason. Fix the CSV and re-import — successful rows are skipped automatically.')

// ═══════════════════════════════════════════════════════════
// 19. ATTACHMENTS
// ═══════════════════════════════════════════════════════════
h1('19. File Attachments')

p('You can attach files to invoices, bills, expenses and projects — useful for saving receipt photos, signed contracts or supporting documents.')

h2('Uploading')
p('On any record, scroll to the Attachments section and click "Upload". Select one or more files (PDF, PNG, JPG, up to 10 MB each). They upload instantly and are listed below.')

h2('Viewing and downloading')
p('Click any attachment to open it in a new tab. Use the download button to save locally.')

h2('Deleting')
p('Click the × next to any attachment to remove it. Deleted files cannot be recovered.')

callout('Security', 'All attachments are stored in org-isolated folders on Vercel Blob with unique random paths. Only users in your organisation can access them.', 'success')

// ═══════════════════════════════════════════════════════════
// 20. TEAM
// ═══════════════════════════════════════════════════════════
h1('20. Team Members & Roles')

p('The Business plan lets you invite up to 5 team members to collaborate on your books with fine-grained access control.')

h2('Inviting a team member')
numbered([
  'Click Settings → Team → "+ Invite Member".',
  'Enter their name, email and role.',
  'They receive an email with a unique invite link valid for 7 days.',
  'When they click the link, they set a password and are added to your organisation.',
])

h2('Roles')
kvTable([
  ['Admin',       'Full access to everything including billing, team and settings'],
  ['Accountant',  'Can create/edit invoices, payments, expenses, reports'],
  ['Viewer',      'Read-only access to reports and documents'],
])

h2('Removing a member')
p('Click the × next to their name in the Team page. They lose access immediately but all their historical actions remain in the audit log.')

// ═══════════════════════════════════════════════════════════
// 21. 2FA
// ═══════════════════════════════════════════════════════════
h1('21. Two-Factor Authentication')

p('Two-factor authentication (2FA) adds a second layer of security to your account. After entering your password, you also enter a 6-digit code from an authenticator app on your phone. 2FA is optional but strongly recommended.')

h2('Setting up 2FA')
numbered([
  'Click Settings → Two-Factor Auth.',
  'Click "Enable 2FA".',
  'Install an authenticator app on your phone: Google Authenticator, Microsoft Authenticator, Authy or 1Password.',
  'Scan the QR code shown on screen with the app.',
  'Enter the 6-digit code your app shows to verify.',
  'Save the 10 backup codes shown — each can be used once if you lose your phone.',
])

h2('Logging in with 2FA')
p('After entering your password, you will be prompted for the 6-digit code from your authenticator app. Enter it to continue. Codes refresh every 30 seconds.')

h2('Using a backup code')
p('If you lose your phone, click "Use backup code" on the 2FA prompt and enter one of the 10 codes from setup. Each code works only once.')

h2('Disabling 2FA')
p('Settings → Two-Factor Auth → "Disable 2FA". You will need to enter your password and a current 2FA code to confirm.')

callout('Important', 'Store your backup codes somewhere safe — a password manager is ideal. If you lose your phone AND lose your backup codes, you will need to contact support to regain access.', 'danger')

// ═══════════════════════════════════════════════════════════
// 22. API
// ═══════════════════════════════════════════════════════════
h1('22. API Keys & Webhooks')

p('HexaLabs Books has a public REST API and webhook system so you can integrate with Zapier, custom scripts, CRMs, e-commerce platforms and anything else that speaks HTTP.')

h2('API Keys')
p('API keys let external systems authenticate to the HexaLabs Books API on your behalf.')

h3('Creating an API key')
numbered([
  'Click Developer → API Keys in the sidebar.',
  'Click "+ New API Key".',
  'Give it a name (e.g. "Zapier integration") and choose scope: Read-only or Read + Write.',
  'Click Create. The plaintext key shows once — copy it immediately, you will not see it again.',
  'Paste it into your external system.',
])

h3('Using the API')
p('Include the key as a Bearer token in the Authorization header:')
p('Authorization: Bearer hxlb_live_xxxxxxxxxxxxxxxxxx', { align: 'left' })

h3('Available endpoints')
bullet([
  'GET /api/v1/invoices — list invoices',
  'POST /api/v1/invoices — create an invoice',
  'GET /api/v1/customers — list customers',
  'POST /api/v1/customers — create a customer',
  'GET /api/v1/products — list products',
  'POST /api/v1/payments — record a payment',
])

h3('Revoking a key')
p('If a key is compromised, open the API Keys page and click "Revoke" next to it. The key stops working immediately.')

h2('Webhooks')
p('Webhooks push real-time notifications to your URL whenever something happens in HexaLabs Books — so you do not have to poll.')

h3('Creating a webhook')
numbered([
  'Click Developer → Webhooks → "+ New Webhook".',
  'Enter your endpoint URL (must be HTTPS in production).',
  'Choose which events to subscribe to: all events, or specific ones like invoice.created, payment.received, bill.created.',
  'Click Create.',
])

h3('Verifying the signature')
p('Every webhook delivery includes an X-HexaLabs-Signature header containing an HMAC-SHA256 signature of the request body, signed with your webhook secret. Your endpoint should verify this before trusting the payload.')

h3('Events available')
bullet([
  'invoice.created, invoice.updated',
  'payment.received, payment.made',
  'customer.created',
  'bill.created',
])

h3('Reliability')
p('If your endpoint returns a non-2xx response, HexaLabs Books retries with exponential backoff. After 10 consecutive failures, the webhook is automatically paused — you can resume it from the Webhooks page after fixing the issue.')

// ═══════════════════════════════════════════════════════════
// 23. AUDIT
// ═══════════════════════════════════════════════════════════
h1('23. Audit Log')

p('Every significant action in HexaLabs Books — invoice created, payment recorded, user logged in, settings changed — is recorded in an append-only audit log with timestamp, user, IP address, and before/after snapshots.')

h2('Viewing the log')
p('Click Audit Log in the sidebar. Filter by user, action type, entity or date range. Click any entry to see the full before/after diff.')

h2('What gets logged')
bullet([
  'All create, update, delete actions on invoices, bills, payments, customers, vendors, products',
  'Logins (successful and failed)',
  'Settings changes (organisation, team, billing)',
  'API key creation and revocation',
  '2FA enable/disable',
])

h2('Retention')
p('Audit log entries are kept for 12 months by default.')

// ═══════════════════════════════════════════════════════════
// 24. BILLING
// ═══════════════════════════════════════════════════════════
h1('24. Billing & Renewals')

p('HexaLabs Books has three plans: Starter (free), Professional (₹999/month), and Business (₹2,499/month).')

h2('Upgrading your plan')
numbered([
  'Click Settings → Billing.',
  'Choose your plan and click "Upgrade".',
  'You will be redirected to Razorpay to pay via UPI, card or net banking.',
  'On success, your plan activates immediately and you get 30 days of access.',
])

h2('Renewing')
p('HexaLabs Books does not auto-renew. 5 days before your current plan expires, you will see a renewal banner on the dashboard. Click "Renew" and pay through Razorpay to get another 30 days.')

h2('Early renewal stacking')
p('If you renew while you still have days left on your current plan, the new 30 days stack on top of what you already have. So renewing with 5 days left gives you 35 days total.')

h2('What happens if I don\'t renew')
p('Your account downgrades to the Starter plan automatically. You lose access to paid features but your data is preserved. Renew any time to restore access.')

h2('Refunds')
p('See our Refund Policy at https://ledgers.hexalabs.online/refund.')

// ═══════════════════════════════════════════════════════════
// 25. TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════
h1('25. Troubleshooting & Support')

h2('Common issues')

h3('I can\'t log in')
p('Check your email and password are correct. If you forgot your password, click "Forgot password" to get a reset link. If you have 2FA enabled and lost your phone, use one of your backup codes. If all else fails, contact support.')

h3('My invoice email didn\'t send')
p('Check the customer email address is valid. Go to the invoice and click "Send by email" again. If the issue persists, check your Settings → Email configuration (Gmail/Outlook setup).')

h3('The PDF looks wrong')
p('Try a different template from the template picker on the invoice form. If your logo is distorted, re-upload it at recommended size (300×100 px).')

h3('GST tax is not splitting correctly')
p('Verify your GSTIN in Settings → Organisation and the customer\'s GSTIN on their customer page. The state is derived from the first 2 digits of the GSTIN.')

h3('A recurring invoice didn\'t generate')
p('Recurring invoices run via a daily cron. If a scheduled run was missed, the next run catches up. Check the recurring template is not Paused and the start date is in the past.')

h3('My reports look wrong')
p('Check the date range. All reports are date-bound. Use "Full Financial Year" if unsure. If a number still seems off, drill into the ledger for that account to see every posting.')

h2('Getting help')
p('Email support: support@hexalabs.online')
p('Status page and updates: follow @hexalabs on social media')

h2('Data backup')
p('Your data is backed up automatically every day by our hosting provider. You can also export any report to CSV at any time from the Reports page. For a full data export, contact support.')

h2('Account deletion')
p('To permanently delete your account and all its data, email support from your registered email address with the subject "Delete my account". Deletion is irreversible — we recommend exporting all reports to CSV first.')

// ═══════════════════════════════════════════════════════════
// CLOSING PAGE
// ═══════════════════════════════════════════════════════════
doc.addPage()

// Centered thank-you block
// Soft background
doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLORS.bgLight)

// Three tall colored bars at top-right (decorative)
doc.rect(PAGE_W - 18, 0, 6, 140).fill('#6366F1')
doc.rect(PAGE_W - 10, 0, 6, 100).fill('#EC4899')
doc.rect(PAGE_W - 2,  0, 6, 60).fill('#10B981')

const cY = 240
doc.fillColor(COLORS.text3).font('Helvetica-Bold').fontSize(10)
   .text('THANK YOU', 0, cY, { align: 'center', width: PAGE_W, characterSpacing: 3 })

doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(42)
   .text('for choosing', 0, cY + 28, { align: 'center', width: PAGE_W, characterSpacing: -0.5 })

// HexaLabs Books with colored "Books."
doc.fillColor('#6366F1').font('Helvetica-Bold').fontSize(42)
const brand1 = 'HexaLabs '
const brand2 = 'Books.'
const w1 = doc.widthOfString(brand1)
const w2 = doc.widthOfString(brand2)
const brandX = (PAGE_W - (w1 + w2)) / 2
doc.text(brand1, brandX, cY + 78, { lineBreak: false, characterSpacing: -0.5 })
doc.fillColor('#EC4899').text(brand2, brandX + w1, cY + 78, { lineBreak: false, characterSpacing: -0.5 })

// Tri-color stripe divider
const divY = cY + 150
doc.rect((PAGE_W - 120) / 2, divY,          40, 3).fill('#6366F1')
doc.rect((PAGE_W - 120) / 2 + 44, divY,     32, 3).fill('#EC4899')
doc.rect((PAGE_W - 120) / 2 + 80, divY,     40, 3).fill('#10B981')

doc.fillColor(COLORS.text2).font('Helvetica').fontSize(12)
   .text('We hope this guide helps you get the most out of the platform.',
         M, divY + 30, { align: 'center', width: CONTENT_W, lineGap: 3 })

// Website link pill
doc.font('Helvetica-Bold').fontSize(12)
const linkLabel = 'ledgers.hexalabs.online'
const linkW = doc.widthOfString(linkLabel) + 40
const linkX = (PAGE_W - linkW) / 2
doc.save()
doc.roundedRect(linkX, divY + 90, linkW, 36, 18).fill('#0B1020')
doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(12)
   .text(linkLabel, linkX, divY + 101, { width: linkW, align: 'center', lineBreak: false, link: 'https://ledgers.hexalabs.online' })
doc.restore()

// Bottom line
doc.rect(0, PAGE_H - 48, PAGE_W, 48).fill(COLORS.text)
doc.rect(0, PAGE_H - 48, PAGE_W, 3).fill('#6366F1')
doc.fillColor('rgba(255,255,255,0.6)').font('Helvetica').fontSize(9)
   .text('© ' + new Date().getFullYear() + ' HEXALABS.  ALL RIGHTS RESERVED.',
         0, PAGE_H - 30, { align: 'center', width: PAGE_W, characterSpacing: 1.5 })

// ═══════════════════════════════════════════════════════════
// HEADER & FOOTER on every page (buffered)
// ═══════════════════════════════════════════════════════════
const range = doc.bufferedPageRange()
const TOTAL = range.count

const LAST = range.start + range.count - 1
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i)

  // Skip header/footer on cover and closing page
  if (i === 0 || i === LAST) continue

  // ── HEADER (logo image only) ──
  const headerY = 36
  doc.save()
  try {
    doc.image(LOGO, M, headerY, { fit: [34, 34] })
  } catch {}
  // Tri-color thin stripe separator
  const stripeY = headerY + 42
  const stripeW = CONTENT_W
  doc.rect(M,                  stripeY, stripeW * 0.4,  2).fill('#6366F1')
  doc.rect(M + stripeW * 0.4,  stripeY, stripeW * 0.35, 2).fill('#EC4899')
  doc.rect(M + stripeW * 0.75, stripeY, stripeW * 0.25, 2).fill('#10B981')
  doc.restore()

  // ── FOOTER ──
  const footerY = PAGE_H - 52
  doc.save()
  // Thin top line
  doc.strokeColor(COLORS.border).lineWidth(0.6)
     .moveTo(M, footerY).lineTo(PAGE_W - M, footerY).stroke()
  // Left: small brand mark
  doc.fillColor(COLORS.text2).font('Helvetica-Bold').fontSize(8.5)
     .text('HEXALABS BOOKS', M, footerY + 14, { characterSpacing: 1.6, lineBreak: false })
  doc.fillColor(COLORS.text4).font('Helvetica').fontSize(8)
     .text('ledgers.hexalabs.online', M, footerY + 26, { lineBreak: false })
  // Right: dark page number pill
  const pageLabel = `${String(i + 1).padStart(2, '0')}  ·  ${String(TOTAL).padStart(2, '0')}`
  doc.font('Helvetica-Bold').fontSize(9)
  const pW = doc.widthOfString(pageLabel) + 24
  const pX = PAGE_W - M - pW
  doc.roundedRect(pX, footerY + 14, pW, 22, 11).fill('#0B1020')
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9)
     .text(pageLabel, pX, footerY + 21, { width: pW, align: 'center', lineBreak: false, characterSpacing: 1 })
  doc.restore()
}

doc.flushPages()
doc.end()
out.on('finish', () => console.log('User guide written to: ' + OUT))
