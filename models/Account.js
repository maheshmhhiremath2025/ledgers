import mongoose from 'mongoose'

const AccountSchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'], required: true },
  group: { type: String, required: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  active: { type: Boolean, default: true },
  description: String,
}, { timestamps: true })

AccountSchema.index({ orgId: 1, code: 1 }, { unique: true })

export default mongoose.models.Account || mongoose.model('Account', AccountSchema)
