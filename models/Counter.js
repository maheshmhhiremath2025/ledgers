import mongoose from 'mongoose'

// Atomic per-org sequence counter (for invoice numbers, PO numbers, etc.)
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "acme:invoice"
  seq: { type: Number, default: 0 },
})

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema)
