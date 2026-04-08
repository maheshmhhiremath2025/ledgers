import mongoose from 'mongoose'

// Straight-line depreciation only (most common, simplest).
// monthlyDepreciation = (cost - salvageValue) / (usefulLifeYears * 12)
const FixedAssetSchema = new mongoose.Schema({
  orgId:           { type: String, required: true, index: true },
  assetNumber:     { type: String, required: true },
  name:            { type: String, required: true },
  category:        { type: String, default: 'Equipment' },  // Equipment / Furniture / Vehicle / Building / Software
  description:     { type: String, default: '' },
  serialNumber:    { type: String, default: '' },
  location:        { type: String, default: '' },

  purchaseDate:    { type: Date, required: true },
  cost:            { type: Number, required: true },
  salvageValue:    { type: Number, default: 0 },
  usefulLifeYears: { type: Number, required: true },

  // Computed fields
  monthlyDepreciation:     { type: Number, default: 0 },
  accumulatedDepreciation: { type: Number, default: 0 },
  bookValue:               { type: Number, default: 0 },
  lastDepreciatedAt:       { type: Date, default: null },

  status:          { type: String, enum: ['Active','Disposed','Sold'], default: 'Active' },
  disposalDate:    { type: Date, default: null },
  disposalAmount:  { type: Number, default: 0 },
}, { timestamps: true })

FixedAssetSchema.index({ orgId: 1, assetNumber: 1 }, { unique: true })

export default mongoose.models.FixedAsset || mongoose.model('FixedAsset', FixedAssetSchema)
