import mongoose from 'mongoose'

const RecurringInvoiceSchema = new mongoose.Schema({
  orgId:     { type: String, required: true, index: true },
  name:      { type: String, required: true }, // e.g. "Monthly retainer - Acme Corp"
  status:    { type: String, enum: ['Active', 'Paused', 'Cancelled'], default: 'Active' },

  // Schedule
  frequency:   { type: String, enum: ['Weekly', 'Monthly', 'Quarterly', 'Yearly'], required: true },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, default: null },       // null = run forever
  nextRunDate: { type: Date, required: true },
  lastRunDate: { type: Date, default: null },
  runCount:    { type: Number, default: 0 },

  // Auto-send
  autoSend:    { type: Boolean, default: false },   // send email automatically
  autoSendTo:  { type: String, default: '' },       // override email, else use customer.email

  // Invoice template
  template: {
    customer:    { name: String, email: String, address: String, gstin: String },
    lineItems:   [{ description: String, qty: Number, rate: Number, tax: Number, amount: Number }],
    currency:    { type: String, default: 'INR' },
    notes:       String,
    terms:       String,
    invoiceTemplate: { type: String, default: 'classic' },
    dueDays:     { type: Number, default: 30 },     // due date = issue date + dueDays
  },
}, { timestamps: true })

export default mongoose.models.RecurringInvoice || mongoose.model('RecurringInvoice', RecurringInvoiceSchema)