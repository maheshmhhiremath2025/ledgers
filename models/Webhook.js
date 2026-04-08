import mongoose from 'mongoose'

const WebhookSchema = new mongoose.Schema({
  orgId:    { type: String, required: true, index: true },
  url:      { type: String, required: true },
  secret:   { type: String, required: true },                       // used to HMAC sign payloads
  events:   { type: [String], default: ['*'] },                     // e.g. ['invoice.created','payment.received'] or ['*']
  active:   { type: Boolean, default: true },
  lastDeliveryAt:     { type: Date, default: null },
  lastStatus:         { type: Number, default: null },
  consecutiveFailures:{ type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.Webhook || mongoose.model('Webhook', WebhookSchema)
