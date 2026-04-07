import mongoose from 'mongoose'

const EstimateLineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty:         { type: Number, default: 1 },
  rate:        { type: Number, default: 0 },
  tax:         { type: Number, default: 0 },
  amount:      { type: Number, default: 0 },
}, { _id: false })

const EstimateSchema = new mongoose.Schema({
  orgId:          { type: String, required: true, index: true },
  estimateNumber: { type: String, required: true },
  status:         { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Declined', 'Invoiced', 'Expired'], default: 'Draft' },

  customer: {
    name:    { type: String, default: '' },
    email:   { type: String, default: '' },
    phone:   { type: String, default: '' },
    address: { type: String, default: '' },
    gstin:   { type: String, default: '' },
  },

  issueDate:  { type: Date, default: Date.now },
  expiryDate: { type: Date },

  lineItems: { type: [EstimateLineSchema], default: [] },
  subtotal:  { type: Number, default: 0 },
  taxTotal:  { type: Number, default: 0 },
  total:     { type: Number, default: 0 },

  currency: { type: String, default: 'INR' },
  notes:    { type: String, default: '' },
  terms:    { type: String, default: '' },

  // If converted to invoice
  convertedInvoiceId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  convertedInvoiceNumber: { type: String, default: '' },
  convertedAt:            { type: Date, default: null },
}, { timestamps: true })

EstimateSchema.index({ orgId: 1, estimateNumber: 1 }, { unique: true })
EstimateSchema.index({ orgId: 1, issueDate: -1 })

export default mongoose.models.Estimate || mongoose.model('Estimate', EstimateSchema)
