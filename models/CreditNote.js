import mongoose from 'mongoose'

const CreditNoteSchema = new mongoose.Schema({
  orgId:          { type: String, required: true },
  creditNoteNumber: { type: String, required: true },
  invoiceId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  invoiceNumber:  { type: String, default: '' },
  customer:       { name: String, email: String, address: String, gstin: String },
  date:           { type: Date, default: Date.now },
  reason:         { type: String, default: '' },
  lineItems:      [{ description: String, qty: Number, rate: Number, tax: Number, amount: Number }],
  subtotal:       { type: Number, default: 0 },
  taxTotal:       { type: Number, default: 0 },
  total:          { type: Number, default: 0 },
  status:         { type: String, enum: ['Draft','Issued','Applied'], default: 'Draft' },
  notes:          { type: String, default: '' },
}, { timestamps: true })

CreditNoteSchema.index({ orgId: 1, creditNoteNumber: 1 }, { unique: true })
export default mongoose.models.CreditNote || mongoose.model('CreditNote', CreditNoteSchema)