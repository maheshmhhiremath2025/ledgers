import mongoose from 'mongoose'

const OrgConfigSchema = new mongoose.Schema({
  orgId:           { type: String, required: true, unique: true },
  businessName:    { type: String, default: '' },
  businessEmail:   { type: String, default: '' },
  businessPhone:   { type: String, default: '' },
  businessAddress: { type: String, default: '' },
  businessWebsite: { type: String, default: '' },
  logoUrl:         { type: String, default: '' },   // base64 data URL
  gstin:           { type: String, default: '' },
  pan:             { type: String, default: '' },
  sacCode:         { type: String, default: '' },
  bankName:        { type: String, default: '' },
  accountName:     { type: String, default: '' },
  accountNumber:   { type: String, default: '' },
  ifscCode:        { type: String, default: '' },
  bankBranch:      { type: String, default: '' },
  upiId:           { type: String, default: '' },   // optional
  razorpayKeyId:   { type: String, default: '' },
  razorpaySecret:  { type: String, default: '' },
  paymentInstructions: { type: String, default: '' },
  invoicePrefix:   { type: String, default: 'INV' },
  poPrefix:        { type: String, default: 'PO' },
  defaultCurrency: { type: String, default: 'INR' },
  defaultTax:      { type: Number, default: 18 },
  defaultTerms:    { type: String, default: 'Payment due within 30 days.' },
  defaultNotes:    { type: String, default: 'Thank you for your business!' },
  signatureName:   { type: String, default: '' },
  signatureTitle:  { type: String, default: '' },
  signatureImage:  { type: String, default: '' },
  footerText:      { type: String, default: 'This is a computer-generated invoice.' },

  // PDF template field visibility — all default to true (shown)
  pdfFields: {
    logo:             { type: Boolean, default: true },
    businessAddress:  { type: Boolean, default: true },
    businessPhone:    { type: Boolean, default: true },
    businessEmail:    { type: Boolean, default: true },
    businessWebsite:  { type: Boolean, default: false },
    gstin:            { type: Boolean, default: true },
    pan:              { type: Boolean, default: true },
    sacCode:          { type: Boolean, default: true },
    customerEmail:    { type: Boolean, default: true },
    customerAddress:  { type: Boolean, default: true },
    customerGstin:    { type: Boolean, default: true },
    dueDate:          { type: Boolean, default: true },
    currency:         { type: Boolean, default: false },
    taxColumn:        { type: Boolean, default: true },
    taxBreakdown:     { type: Boolean, default: true },
    paidAmount:       { type: Boolean, default: true },
    bankDetails:      { type: Boolean, default: true },
    paymentInstr:     { type: Boolean, default: true },
    notes:            { type: Boolean, default: true },
    terms:            { type: Boolean, default: true },
    signature:        { type: Boolean, default: true },
    footerText:       { type: Boolean, default: true },
  },

  // Email / SMTP config
  smtpHost:        { type: String, default: '' },
  smtpPort:        { type: Number, default: 587 },
  smtpUser:        { type: String, default: '' },
  smtpPass:        { type: String, default: '' },
  smtpFrom:        { type: String, default: '' },  // "Company Name <email@domain.com>"
  smtpSecure:      { type: Boolean, default: false },
  emailSubject:    { type: String, default: 'Invoice {{invoiceNumber}} from {{businessName}}' },
  emailBody:       { type: String, default: 'Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}.\n\nKindly make the payment by {{dueDate}}.\n\nThank you for your business!\n\n{{businessName}}' },
}, { timestamps: true })

export default mongoose.models.OrgConfig || mongoose.model('OrgConfig', OrgConfigSchema)