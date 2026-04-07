import mongoose from 'mongoose'

const BillLineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty:         { type: Number, default: 1 },
  rate:        { type: Number, default: 0 },
  tax:         { type: Number, default: 0 }, // GST %
  amount:      { type: Number, default: 0 },
  expenseAccount: { type: String, default: '' }, // optional account code
}, { _id: false })

const BillSchema = new mongoose.Schema({
  orgId:      { type: String, required: true, index: true },
  billNumber: { type: String, required: true }, // auto-generated internal ref e.g. BILL-0001
  vendorBillNumber: { type: String, default: '' }, // the number printed on the vendor's bill
  status:     { type: String, enum: ['Draft', 'Open', 'Partial', 'Paid', 'Overdue', 'Cancelled'], default: 'Open' },

  vendor: {
    name:    { type: String, required: true },
    email:   { type: String, default: '' },
    phone:   { type: String, default: '' },
    address: { type: String, default: '' },
    gstin:   { type: String, default: '' },
  },

  // Optional link to the originating PO
  purchaseOrderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  purchaseOrderNumber: { type: String, default: '' },

  billDate: { type: Date, default: Date.now, required: true },
  dueDate:  { type: Date },

  lineItems: { type: [BillLineSchema], default: [] },
  subtotal:  { type: Number, default: 0 },
  taxTotal:  { type: Number, default: 0 },
  total:     { type: Number, default: 0 },
  paidAmount:{ type: Number, default: 0 },

  // TDS deducted by us when paying the vendor
  tdsRate:    { type: Number, default: 0 },
  tdsAmount:  { type: Number, default: 0 },
  tdsSection: { type: String, default: '' },

  currency: { type: String, default: 'INR' },
  notes:    { type: String, default: '' },
  attachmentUrl: { type: String, default: '' }, // optional link to scanned bill
}, { timestamps: true })

BillSchema.index({ orgId: 1, billNumber: 1 }, { unique: true })
BillSchema.index({ orgId: 1, billDate: -1 })
BillSchema.index({ orgId: 1, status: 1 })

export default mongoose.models.Bill || mongoose.model('Bill', BillSchema)
