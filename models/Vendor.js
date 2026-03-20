import mongoose from 'mongoose'

const VendorSchema = new mongoose.Schema({
  orgId:   { type: String, required: true, index: true },
  name:    { type: String, required: true },
  email:   { type: String, default: '' },
  address: { type: String, default: '' },
  gstin:   { type: String, default: '' },
  phone:   { type: String, default: '' },
}, { timestamps: true })

VendorSchema.index({ orgId: 1, name: 1 })
export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema)