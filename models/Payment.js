import mongoose from 'mongoose'

const PaymentSchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  paymentNumber: { type: String, required: true },
  type: { type: String, enum: ['Receipt', 'Payment'], required: true }, // Receipt = customer paid us, Payment = we paid vendor
  referenceType: { type: String, enum: ['Invoice', 'PurchaseOrder', 'Other'] },
  referenceId: mongoose.Schema.Types.ObjectId,
  referenceNumber: String,
  party: {
    name: { type: String, required: true },
    email: String,
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentDate: { type: Date, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other'], default: 'Bank Transfer' },
  method: { type: String, default: 'Other' }, // alias used by auto-record
  bankAccount: String,
  reference: String,
  notes: String,
  status: { type: String, enum: ['Pending', 'Cleared', 'Bounced'], default: 'Cleared' },
}, { timestamps: true })

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)