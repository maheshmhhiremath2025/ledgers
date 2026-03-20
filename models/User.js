import mongoose from 'mongoose'
import crypto from 'crypto'

const UserSchema = new mongoose.Schema({
  orgId:        { type: String, required: true, index: true },
  name:         { type: String, required: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin', 'accountant', 'viewer'], default: 'accountant' },
  active:       { type: Boolean, default: true },

  // Invite flow
  inviteToken:  { type: String, default: null, index: true },
  inviteExpiry: { type: Date,   default: null },
  invitedBy:    { type: String, default: null },
  status:       { type: String, enum: ['active', 'invited', 'disabled'], default: 'active' },
  razorpaySubId:     { type: String, default: null },
  subscriptionPlan:  { type: String, default: null },

  // Plan
  plan:         { type: String, enum: ['starter', 'professional', 'business'], default: 'starter' },
  planExpiry:   { type: Date, default: null },
  trialEndsAt:  { type: Date, default: null },

  // Usage counters (reset monthly)
  usagePeriod:      { type: String, default: '' }, // e.g. "2026-03"
  invoiceCount:     { type: Number, default: 0 },
  poCount:          { type: Number, default: 0 },
}, { timestamps: true })

UserSchema.methods.setPassword = function(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  this.passwordHash = `${salt}:${hash}`
}

UserSchema.methods.verifyPassword = function(password) {
  const [salt, hash] = this.passwordHash.split(':')
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return verify === hash
}

UserSchema.methods.isActive = function() {
  if (this.plan === 'starter') return true
  if (this.trialEndsAt && new Date() < this.trialEndsAt) return true
  if (this.planExpiry && new Date() < this.planExpiry) return true
  return false
}

// Each email can only have ONE record per org, but can have multiple orgs
UserSchema.index({ email: 1, orgId: 1 }, { unique: true })
UserSchema.index({ email: 1 })
UserSchema.index({ orgId: 1 })

export default mongoose.models.User || mongoose.model('User', UserSchema)