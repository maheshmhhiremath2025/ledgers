import mongoose from 'mongoose'
import crypto from 'crypto'

const UserSchema = new mongoose.Schema({
  orgId:        { type: String, required: true },
  name:         { type: String, required: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin', 'accountant', 'viewer'], default: 'accountant' },
  active:       { type: Boolean, default: true },

  // Invite flow
  inviteToken:  { type: String, default: null, index: true },
  inviteExpiry: { type: Date,   default: null },

  // Password reset
  resetToken:   { type: String, default: null, index: true },
  resetExpiry:  { type: Date,   default: null },
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

// New format: "v2:<iterations>:<salt>:<hash>" using 120,000 PBKDF2 iterations.
// Legacy format: "<salt>:<hash>" with 1,000 iterations — still verifiable, auto-upgraded on next successful login.
const PBKDF2_ITERATIONS = 120000

UserSchema.methods.setPassword = function(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex')
  this.passwordHash = `v2:${PBKDF2_ITERATIONS}:${salt}:${hash}`
}

UserSchema.methods.verifyPassword = function(password) {
  if (!this.passwordHash) return false
  const parts = this.passwordHash.split(':')
  let salt, hash, iters
  if (parts[0] === 'v2' && parts.length === 4) {
    iters = parseInt(parts[1], 10)
    salt  = parts[2]
    hash  = parts[3]
  } else if (parts.length === 2) {
    // Legacy
    iters = 1000
    salt  = parts[0]
    hash  = parts[1]
  } else {
    return false
  }
  const verify = crypto.pbkdf2Sync(password, salt, iters, 64, 'sha512').toString('hex')
  // Constant-time compare
  const a = Buffer.from(verify, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

UserSchema.methods.needsPasswordRehash = function() {
  return !this.passwordHash || !this.passwordHash.startsWith(`v2:${PBKDF2_ITERATIONS}:`)
}

UserSchema.methods.isActive = function() {
  if (this.plan === 'starter') return true
  if (this.planExpiry && new Date() < this.planExpiry) return true
  return false
}

// Each email can only have ONE record per org, but can have multiple orgs
UserSchema.index({ email: 1, orgId: 1 }, { unique: true })
UserSchema.index({ email: 1 })
UserSchema.index({ orgId: 1 })

export default mongoose.models.User || mongoose.model('User', UserSchema)