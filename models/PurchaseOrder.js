import mongoose from 'mongoose'

const POLineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  amount: { type: Number, required: true },
})

const PurchaseOrderSchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  poNumber: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Sent', 'Paid', 'Partial', 'Cancelled'], default: 'Draft' },
  vendor: {
    name: { type: String, required: true },
    email: String,
    address: String,
    gstin: String,
  },
  issueDate: { type: Date, required: true },
  expectedDate: { type: Date },
  deliveryAddress: String,
  lineItems: [POLineSchema],
  subtotal: Number,
  taxTotal: Number,
  total: Number,
  notes: String,
  terms: String,
  currency: { type: String, default: 'INR' },
}, { timestamps: true })

export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema)