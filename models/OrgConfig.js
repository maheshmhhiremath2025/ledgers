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
  // Email / SMTP config
  smtpHost:        { type: String, default: '' },
  smtpPort:        { type: Number, default: 587 },
  smtpUser:        { type: String, default: '' },
  smtpPass:        { type: String, default: '' },
  smtpFrom:        { type: String, default: '' },  // "Company Name <email@domain.com>"
  smtpSecure:      { type: Boolean, default: false },
  emailSubject:    { type: String, default: 'Invoice {{invoiceNumber}} from {{businessName}}' },
  emailBody:       { type: String, default: 'Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{amount}}.\n\n{{notes}}\n\nThank you for your business!\n\n{{businessName}}' },
}, { timestamps: true })

export default mongoose.models.OrgConfig || mongoose.model('OrgConfig', OrgConfigSchema)