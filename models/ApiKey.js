import mongoose from 'mongoose'

// API keys for the public REST API. The plaintext key is shown ONCE on creation;
// only its sha256 hash is stored. Format: hxlb_live_<32 hex chars>
const ApiKeySchema = new mongoose.Schema({
  orgId:      { type: String, required: true, index: true },
  name:       { type: String, required: true },                    // user-supplied label
  prefix:     { type: String, required: true },                    // first 12 chars for display ("hxlb_live_ab")
  hash:       { type: String, required: true, index: true },       // sha256 of full key
  scopes:     { type: [String], default: ['read','write'] },       // 'read' | 'write'
  createdBy:  { type: String, default: null },
  lastUsedAt: { type: Date, default: null },
  active:     { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema)
