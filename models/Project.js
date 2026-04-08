import mongoose from 'mongoose'

const ProjectSchema = new mongoose.Schema({
  orgId:       { type: String, required: true, index: true },
  name:        { type: String, required: true },
  customer:    { name: String, email: String, gstin: String },
  description: { type: String, default: '' },
  hourlyRate:  { type: Number, default: 0 },
  currency:    { type: String, default: 'INR' },
  status:      { type: String, enum: ['Active','Completed','Archived'], default: 'Active' },
  startDate:   { type: Date, default: Date.now },
  dueDate:     { type: Date, default: null },
  budget:      { type: Number, default: 0 },
}, { timestamps: true })

ProjectSchema.index({ orgId: 1, name: 1 })
export default mongoose.models.Project || mongoose.model('Project', ProjectSchema)
