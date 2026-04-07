import AuditLog from '../models/AuditLog'

// Fire-and-forget audit log writer. Never throws — failures are logged to console only,
// so audit issues never break the user-facing operation.
//
// Usage:
//   await audit(req, auth, {
//     action: 'invoice.create', entityType: 'Invoice', entityId: inv._id,
//     entityRef: inv.invoiceNumber, amount: inv.total, after: inv.toObject()
//   })
export async function audit(req, auth, fields) {
  try {
    const ip = (req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || req?.socket?.remoteAddress || ''
    const ua = req?.headers?.['user-agent'] || ''
    await AuditLog.create({
      orgId:      auth?.orgId || fields.orgId,
      userId:     auth?.userId || null,
      userEmail:  auth?.email  || '',
      userName:   auth?.name   || '',
      action:     fields.action,
      entityType: fields.entityType,
      entityId:   fields.entityId ? String(fields.entityId) : null,
      entityRef:  fields.entityRef || '',
      amount:     fields.amount ?? null,
      before:     fields.before ?? null,
      after:      fields.after ?? null,
      meta:       { ip, ua, ...(fields.meta || {}) },
    })
  } catch (e) {
    console.error('[audit] write failed:', e.message)
  }
}
