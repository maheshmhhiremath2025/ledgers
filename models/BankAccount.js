import mongoose from 'mongoose'

const BankAccountSchema = new mongoose.Schema({
  orgId:         { type: String, required: true, index: true },
  name:          { type: String, required: true },        // e.g. "HDFC Current"
  bankName:      { type: String, default: '' },
  accountNumber: { type: String, default: '' },           // last 4 only recommended
  ifsc:          { type: String, default: '' },
  branch:        { type: String, default: '' },
  type:          { type: String, enum: ['Bank', 'Cash', 'CreditCard'], default: 'Bank' },
  currency:      { type: String, default: 'INR' },
  openingBalance:{ type: Number, default: 0 },
  currentBalance:{ type: Number, default: 0 },
  // Link to chart-of-accounts entry (optional)
  accountCode:   { type: String, default: '1010' },
  active:        { type: Boolean, default: true },
  notes:         { type: String, default: '' },
}, { timestamps: true })

BankAccountSchema.index({ orgId: 1, name: 1 })

export default mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema)
