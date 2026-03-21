#!/usr/bin/env python3
import sys, json, base64, io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

data = json.loads(sys.stdin.read())
inv = data['invoice']
cfg = data['config']

buf = io.BytesIO()
doc = SimpleDocTemplate(buf, pagesize=A4,
    leftMargin=15*mm, rightMargin=15*mm,
    topMargin=12*mm, bottomMargin=12*mm)

W, H = A4
styles = getSampleStyleSheet()

ACCENT = colors.HexColor('#6366F1')
ACCENT_LIGHT = colors.HexColor('#EEF2FF')
ACCENT_MID = colors.HexColor('#C7D2FE')
TEXT = colors.HexColor('#1a1a1a')
MUTED = colors.HexColor('#666666')
FAINT = colors.HexColor('#999999')
WHITE = colors.white
LINE = colors.HexColor('#DDD6FE')

def p(text, size=9, color=TEXT, bold=False, align=TA_LEFT, leading=None):
    return Paragraph(str(text or ''), ParagraphStyle('x',
        fontSize=size, textColor=color,
        fontName='Helvetica-Bold' if bold else 'Helvetica',
        alignment=align, leading=leading or size+3))

story = []

biz = cfg.get('businessName','')
logo_b64 = cfg.get('logoUrl','')

# ── HEADER ──────────────────────────────────────────────────────────────────
header_data = [['', '']]
logo_cell = ''
if logo_b64 and logo_b64.startswith('data:image'):
    try:
        header, enc = logo_b64.split(',',1)
        raw = base64.b64decode(enc)
        img_buf = io.BytesIO(raw)
        logo_cell = Image(img_buf, width=45*mm, height=18*mm, kind='proportional')
    except:
        logo_cell = p(biz, 16, ACCENT, True)
else:
    logo_cell = p(biz, 16, ACCENT, True)

inv_right = [
    [p('INVOICE', 20, ACCENT, True, TA_RIGHT)],
    [p(inv.get('invoiceNumber',''), 11, MUTED, False, TA_RIGHT)],
    [p(inv.get('status',''), 9, colors.HexColor('#185FA5'), False, TA_RIGHT)],
]

hdr_table = Table([[logo_cell,
    Table(inv_right, colWidths=[70*mm],
        style=TableStyle([('ALIGN',(0,0),(-1,-1),'RIGHT'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),1),('BOTTOMPADDING',(0,0),(-1,-1),1)]))]],
    colWidths=[95*mm, 85*mm])
hdr_table.setStyle(TableStyle([
    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ('ALIGN',(0,0),(0,0),'LEFT'),
    ('ALIGN',(1,0),(1,0),'RIGHT'),
]))
story.append(hdr_table)
story.append(HRFlowable(width='100%', thickness=2, color=ACCENT, spaceAfter=6))

# Business sub-info
biz_parts = []
if cfg.get('businessAddress'): biz_parts.append(cfg['businessAddress'].replace('\n','  '))
if cfg.get('businessEmail'):   biz_parts.append(cfg['businessEmail'])
if cfg.get('businessPhone'):   biz_parts.append(cfg['businessPhone'])
if cfg.get('gstin'):           biz_parts.append(f"GST: {cfg['gstin']}")
if biz_parts:
    story.append(p(' · '.join(biz_parts), 8, MUTED))
    story.append(Spacer(1, 4))

# ── BILL TO / INVOICE DETAILS ────────────────────────────────────────────────
cust = inv.get('customer', {})
issue = inv.get('issueDate','')[:10] if inv.get('issueDate') else ''
due   = inv.get('dueDate','')[:10]   if inv.get('dueDate')   else ''

def fmt_date(d):
    if not d: return ''
    try:
        from datetime import datetime
        return datetime.strptime(d,'%Y-%m-%d').strftime('%d %b %Y')
    except: return d

bill_rows = [
    [p('BILL TO', 8, FAINT, True), p('INVOICE DETAILS', 8, FAINT, True)],
    [p(cust.get('name',''), 11, TEXT, True), p(f"Invoice #: {inv.get('invoiceNumber','')}", 9, TEXT)],
]
if cust.get('email'):
    bill_rows.append([p(cust['email'], 8, MUTED), p(f"Issue Date: {fmt_date(issue)}", 9, TEXT)])
if cust.get('address'):
    bill_rows.append([p(cust['address'], 8, MUTED), p(f"Due Date: {fmt_date(due)}", 9, TEXT)])
if cust.get('gstin'):
    bill_rows.append([p(f"GSTIN: {cust['gstin']}", 8, MUTED), p(f"Currency: {inv.get('currency','INR')}", 9, TEXT)])

parties = Table(bill_rows, colWidths=[90*mm, 90*mm])
parties.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(0,-1), colors.HexColor('#F5F3FF')),
    ('BACKGROUND',(1,0),(1,-1), ACCENT_LIGHT),
    ('BOX',(0,0),(0,-1), 0.5, LINE),
    ('BOX',(1,0),(1,-1), 0.5, ACCENT_MID),
    ('TOPPADDING',(0,0),(-1,-1), 4),
    ('BOTTOMPADDING',(0,0),(-1,-1), 4),
    ('LEFTPADDING',(0,0),(-1,-1), 8),
    ('RIGHTPADDING',(0,0),(-1,-1), 8),
    ('ROWBACKGROUNDS',(0,0),(-1,-1),[None, None]),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
]))
story.append(parties)
story.append(Spacer(1, 8))

# ── LINE ITEMS ───────────────────────────────────────────────────────────────
currency = inv.get('currency','INR')
sym = '₹' if currency == 'INR' else currency + ' '

def fmt_money(n):
    try:
        v = float(n or 0)
        return f"{sym}{v:,.2f}"
    except: return f"{sym}0.00"

line_items = inv.get('lineItems', [])
tbl_head = [
    p('#', 8, WHITE, True, TA_CENTER),
    p('Description', 8, WHITE, True),
    p('Qty', 8, WHITE, True, TA_RIGHT),
    p('Rate', 8, WHITE, True, TA_RIGHT),
    p('Tax', 8, WHITE, True, TA_CENTER),
    p('Amount', 8, WHITE, True, TA_RIGHT),
]
rows = [tbl_head]
subtotal = 0
tax_total = 0
for i, item in enumerate(line_items):
    qty  = float(item.get('qty',0) or 0)
    rate = float(item.get('rate',0) or 0)
    tax  = float(item.get('tax',0) or 0)
    base = qty * rate
    txv  = base * tax / 100
    amt  = base + txv
    subtotal  += base
    tax_total += txv
    rows.append([
        p(str(i+1), 8, TEXT, False, TA_CENTER),
        p(item.get('description',''), 9, TEXT),
        p(str(qty if qty != int(qty) else int(qty)), 9, TEXT, False, TA_RIGHT),
        p(fmt_money(rate), 9, TEXT, False, TA_RIGHT),
        p(f"{int(tax)}%", 9, TEXT, False, TA_CENTER),
        p(fmt_money(amt), 9, TEXT, True, TA_RIGHT),
    ])

grand = subtotal + tax_total
paid  = float(inv.get('paidAmount', 0) or 0)
balance = grand - paid

col_w = [10*mm, 73*mm, 15*mm, 28*mm, 15*mm, 28*mm]
items_tbl = Table(rows, colWidths=col_w, repeatRows=1)
row_bg = [ACCENT_LIGHT if i%2==0 else WHITE for i in range(len(rows)-1)]
items_tbl.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), ACCENT),
    ('ROWBACKGROUNDS',(0,1),(-1,-1), [ACCENT_LIGHT, WHITE]),
    ('BOX',(0,0),(-1,-1), 0.5, LINE),
    ('INNERGRID',(0,0),(-1,-1), 0.25, LINE),
    ('TOPPADDING',(0,0),(-1,-1), 5),
    ('BOTTOMPADDING',(0,0),(-1,-1), 5),
    ('LEFTPADDING',(0,0),(-1,-1), 5),
    ('RIGHTPADDING',(0,0),(-1,-1), 5),
    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
]))
story.append(items_tbl)

# ── TOTALS ───────────────────────────────────────────────────────────────────
tot_rows = [
    [p('Subtotal', 9, MUTED), p(fmt_money(subtotal), 9, TEXT, False, TA_RIGHT)],
    [p('Tax (GST)', 9, MUTED), p(fmt_money(tax_total), 9, TEXT, False, TA_RIGHT)],
]
if paid > 0:
    tot_rows.append([p('Paid', 9, colors.HexColor('#3B6D11')), p(fmt_money(paid), 9, colors.HexColor('#3B6D11'), True, TA_RIGHT)])
tot_rows.append([p('Balance Due', 10, ACCENT, True), p(fmt_money(balance), 11, ACCENT, True, TA_RIGHT)])

tot_tbl = Table([[
    '',
    Table(tot_rows, colWidths=[40*mm, 38*mm],
        style=TableStyle([
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('LINEABOVE',(0,-1),(-1,-1),1.5,ACCENT),
            ('LINEBELOW',(0,-2),(-1,-2),0.25,LINE),
        ]))
]], colWidths=[101*mm, 79*mm])
story.append(tot_tbl)
story.append(Spacer(1, 6))

# ── BANK DETAILS ─────────────────────────────────────────────────────────────
bank_fields = ['bankName','accountName','accountNumber','ifscCode','bankBranch','upiId']
bank_vals = {k: cfg.get(k,'') for k in bank_fields}
if any(bank_vals.values()):
    bank_data = [[p('BANK DETAILS', 8, ACCENT, True)]]
    pairs = [
        ('Bank', bank_vals['bankName']),
        ('Account Name', bank_vals['accountName']),
        ('Account No.', bank_vals['accountNumber']),
        ('IFSC', bank_vals['ifscCode']),
        ('Branch', bank_vals['bankBranch']),
        ('UPI', bank_vals['upiId']),
    ]
    for label, val in pairs:
        if val:
            bank_data.append([p(f"{label}: ", 8, MUTED), p(val, 8, TEXT, True)])
    bank_sub = Table([[
        Table(bank_data, colWidths=[85*mm],
            style=TableStyle([
                ('BACKGROUND',(0,0),(-1,-1), ACCENT_LIGHT),
                ('BOX',(0,0),(-1,-1), 0.5, ACCENT_MID),
                ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
                ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
            ])),
        ''
    ]], colWidths=[90*mm, 90*mm])
    story.append(bank_sub)
    story.append(Spacer(1, 5))

# ── NOTES & TERMS ────────────────────────────────────────────────────────────
notes = inv.get('notes','')
terms = inv.get('terms','')
if notes or terms:
    nt_rows = []
    if notes:
        nt_rows.append([p('NOTES', 8, FAINT, True), p('TERMS & CONDITIONS', 8, FAINT, True) if terms else ''])
        nt_rows.append([p(notes, 8, MUTED), p(terms, 8, MUTED) if terms else ''])
    elif terms:
        nt_rows.append([p('TERMS & CONDITIONS', 8, FAINT, True)])
        nt_rows.append([p(terms, 8, MUTED)])
    nt_tbl = Table(nt_rows, colWidths=[90*mm, 90*mm] if (notes and terms) else [180*mm])
    nt_tbl.setStyle(TableStyle([
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('BOX',(0,0),(0,-1),0.5,colors.HexColor('#F59E0B')),
        ('BACKGROUND',(0,0),(0,-1),colors.HexColor('#FFFBF0')),
        ('BOX',(1,0),(1,-1),0.5,LINE) if (notes and terms) else ('TOPPADDING',(0,0),(0,0),0),
        ('BACKGROUND',(1,0),(1,-1),colors.HexColor('#F5F3FF')) if (notes and terms) else ('TOPPADDING',(0,0),(0,0),0),
    ]))
    story.append(nt_tbl)
    story.append(Spacer(1, 5))

# ── SIGNATURE ─────────────────────────────────────────────────────────────────
sig_name  = cfg.get('signatureName','')
sig_title = cfg.get('signatureTitle','')
sig_img   = cfg.get('signatureImage','')

if sig_name or sig_img:
    sig_content = []
    sig_content.append(p(f"For {biz}", 8, FAINT))
    if sig_img and sig_img.startswith('data:image'):
        try:
            _, enc = sig_img.split(',',1)
            raw = base64.b64decode(enc)
            sb = io.BytesIO(raw)
            sig_content.append(Image(sb, width=45*mm, height=18*mm, kind='proportional'))
        except:
            sig_content.append(HRFlowable(width=50*mm, thickness=0.5, color=LINE, spaceBefore=16, spaceAfter=4))
    else:
        sig_content.append(HRFlowable(width=50*mm, thickness=0.5, color=LINE, spaceBefore=16, spaceAfter=4))
    if sig_name:  sig_content.append(p(sig_name, 9, TEXT, True))
    if sig_title: sig_content.append(p(sig_title, 8, MUTED))
    sig_content.append(p('Authorized Signatory', 8, FAINT))
    sig_inner = Table([[c] for c in sig_content], colWidths=[65*mm])
    sig_inner.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
    sig_outer = Table([['', sig_inner]], colWidths=[115*mm, 65*mm])
    story.append(sig_outer)
    story.append(Spacer(1, 4))

# ── FOOTER ─────────────────────────────────────────────────────────────────
story.append(HRFlowable(width='100%', thickness=0.5, color=LINE, spaceAfter=4))
footer_txt = cfg.get('footerText','This is a computer-generated invoice.')
from datetime import datetime
date_str = datetime.now().strftime('%d %b %Y')
footer_row = Table([
    [p(footer_txt, 8, FAINT), p(f"{biz}  ·  {date_str}", 8, FAINT, False, TA_RIGHT)]
], colWidths=[110*mm, 70*mm])
story.append(footer_row)

doc.build(story)
print(base64.b64encode(buf.getvalue()).decode())