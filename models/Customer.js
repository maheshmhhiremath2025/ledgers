import mongoose from 'mongoose'

const CustomerSchema = new mongoose.Schema({
  orgId:   { type: String, required: true },
  name:    { type: String, required: true },
  email:   { type: String, default: '' },
  address: { type: String, default: '' },
  gstin:   { type: String, default: '' },
  phone:   { type: String, default: '' },
}, { timestamps: true })

CustomerSchema.index({ orgId: 1, name: 1 })

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema)