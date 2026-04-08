import mongoose from 'mongoose'

const RecurringExpenseSchema = new mongoose.Schema({
  orgId:       { type: String, required: true, index: true },
  name:        { type: String, required: true },
  category:    { type: String, default: 'Miscellaneous' },
  vendor:      { type: String, default: '' },
  description: { type: String, default: '' },
  amount:      { type: Number, required: true },
  tax:         { type: Number, default: 0 },
  paymentMode: { type: String, default: 'Bank Transfer' },

  frequency:   { type: String, enum: ['weekly','monthly','quarterly','yearly'], default: 'monthly' },
  startDate:   { type: Date, required: true },
  nextDate:    { type: Date, required: true, index: true },
  endDate:     { type: Date, default: null },

  active:      { type: Boolean, default: true },
  lastRunAt:   { type: Date, default: null },
  generatedCount: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.RecurringExpense || mongoose.model('RecurringExpense', RecurringExpenseSchema)
