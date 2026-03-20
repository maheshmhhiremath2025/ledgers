import mongoose from 'mongoose'

const JELineSchema = new mongoose.Schema({
  accountId: mongoose.Schema.Types.ObjectId,
  accountCode: String,
  accountName: String,
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  narration: String,
})

const JournalEntrySchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  entryNumber: { type: String, required: true },
  date: { type: Date, required: true },
  reference: String,
  narration: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Posted'], default: 'Draft' },
  lines: [JELineSchema],
  sourceType: { type: String, enum: ['Manual', 'Invoice', 'Payment', 'PO'], default: 'Manual' },
  sourceId: mongoose.Schema.Types.ObjectId,
  currency: { type: String, default: 'INR' },
}, { timestamps: true })

export default mongoose.models.JournalEntry || mongoose.model('JournalEntry', JournalEntrySchema)
