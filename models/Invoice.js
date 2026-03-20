import mongoose from 'mongoose'

const LineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  tax: { type: Number, default: 0 }, // percentage
  amount: { type: Number, required: true },
})

const InvoiceSchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Due', 'Sent', 'Paid', 'Overdue', 'Cancelled'], default: 'Draft' },
  template: { type: String, default: 'classic' },
  paymentToken: { type: String, default: null, index: true }, // public portal link token
  lastReminderAt: { type: Date, default: null },
  reminderCount:  { type: Number, default: 0 },
  customer: {
    name: { type: String, required: true },
    email: String,
    address: String,
    gstin: String,
  },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  lineItems: [LineItemSchema],
  subtotal: Number,
  taxTotal: Number,
  total: Number,
  notes: String,
  terms: String,
  currency: { type: String, default: 'INR' },
  paidAmount: { type: Number, default: 0 },
  paidDate: Date,
}, { timestamps: true })

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema)