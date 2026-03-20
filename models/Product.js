import mongoose from 'mongoose'

const ProductSchema = new mongoose.Schema({
  orgId:       { type: String, required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  hsnCode:     { type: String, default: '' },
  sacCode:     { type: String, default: '' },
  unit:        { type: String, default: 'pcs' },
  price:       { type: Number, default: 0 },
  taxRate:     { type: Number, default: 18 },
  category:    { type: String, default: '' },
  active:      { type: Boolean, default: true },
}, { timestamps: true })

ProductSchema.index({ orgId: 1, name: 1 })
export default mongoose.models.Product || mongoose.model('Product', ProductSchema)