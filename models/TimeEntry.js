import mongoose from 'mongoose'

const TimeEntrySchema = new mongoose.Schema({
  orgId:       { type: String, required: true, index: true },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  projectName: { type: String, default: '' },
  userId:      { type: String, default: null },
  userName:    { type: String, default: '' },
  date:        { type: Date, required: true },
  hours:       { type: Number, required: true },
  description: { type: String, default: '' },
  hourlyRate:  { type: Number, default: 0 }, // overrides project rate if set
  billable:    { type: Boolean, default: true },
  invoicedAt:  { type: Date, default: null },
  invoiceId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
}, { timestamps: true })

TimeEntrySchema.index({ orgId: 1, date: -1 })
TimeEntrySchema.index({ orgId: 1, projectId: 1, billable: 1, invoicedAt: 1 })

export default mongoose.models.TimeEntry || mongoose.model('TimeEntry', TimeEntrySchema)
