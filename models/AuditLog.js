import mongoose from 'mongoose'

// Append-only audit trail of financial actions for compliance/debugging.
// Never edit or delete records — write-only from app code.
const AuditLogSchema = new mongoose.Schema({
  orgId:      { type: String, required: true, index: true },
  userId:     { type: String, default: null },
  userEmail:  { type: String, default: '' },
  userName:   { type: String, default: '' },
  action:     { type: String, required: true },   // e.g. 'invoice.create', 'payment.delete'
  entityType: { type: String, required: true },   // e.g. 'Invoice', 'Payment', 'CreditNote'
  entityId:   { type: String, default: null },
  entityRef:  { type: String, default: '' },      // e.g. 'INV-0023', 'RCP-0007'
  amount:     { type: Number, default: null },    // financial value if applicable
  before:     { type: mongoose.Schema.Types.Mixed, default: null }, // snapshot before change
  after:      { type: mongoose.Schema.Types.Mixed, default: null }, // snapshot after change
  meta:       { type: mongoose.Schema.Types.Mixed, default: null }, // ip, ua, notes, etc.
}, { timestamps: { createdAt: true, updatedAt: false } })

AuditLogSchema.index({ orgId: 1, createdAt: -1 })
AuditLogSchema.index({ orgId: 1, entityType: 1, entityId: 1 })

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema)
