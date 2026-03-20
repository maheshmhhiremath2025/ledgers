import mongoose from 'mongoose'

const ExpenseSchema = new mongoose.Schema({
  orgId:       { type: String, required: true },
  expenseNumber: { type: String, required: true },
  date:        { type: Date, required: true },
  category:    { type: String, required: true }, // Rent, Salaries, Travel, etc.
  vendor:      { type: String, default: '' },
  description: { type: String, default: '' },
  amount:      { type: Number, required: true },
  tax:         { type: Number, default: 0 }, // GST %
  taxAmount:   { type: Number, default: 0 },
  total:       { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other'], default: 'Bank Transfer' },
  reference:   { type: String, default: '' },
  notes:       { type: String, default: '' },
  status:      { type: String, enum: ['Recorded', 'Pending'], default: 'Recorded' },
}, { timestamps: true })

ExpenseSchema.index({ orgId: 1, date: -1 })

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema)