import Counter from '../models/Counter'

// Atomically generate next sequence number for an org+kind combo.
// Returns the new integer (starts at 1).
export async function nextSeq(orgId, kind) {
  const id = `${orgId}:${kind}`
  const doc = await Counter.findByIdAndUpdate(
    id,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
  return doc.seq
}

// Format with prefix and zero-padding: nextNumber('acme','invoice','INV',4) → "INV-0001"
export async function nextNumber(orgId, kind, prefix, pad = 4) {
  const n = await nextSeq(orgId, kind)
  return `${prefix}-${String(n).padStart(pad, '0')}`
}

// Round money to 2 decimal places (avoids float drift)
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

// Compute totals for line items with consistent rounding.
// Each item gets a rounded `amount` field (qty * rate, rounded).
// Tax is computed on the rounded line amount, then rounded.
export function computeLineTotals(lineItems = []) {
  let subtotal = 0
  let taxTotal = 0
  const items = lineItems.map(item => {
    const qty  = Number(item.qty)  || 0
    const rate = Number(item.rate) || 0
    const tax  = Number(item.tax)  || 0
    const amount = round2(qty * rate)
    const taxAmt = round2((amount * tax) / 100)
    subtotal += amount
    taxTotal += taxAmt
    return { ...item, amount }
  })
  subtotal = round2(subtotal)
  taxTotal = round2(taxTotal)
  return { items, subtotal, taxTotal, total: round2(subtotal + taxTotal) }
}
