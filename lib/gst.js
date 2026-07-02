// GST helpers — split a single GST percent into CGST/SGST (intra-state)
// or IGST (inter-state), based on comparing state codes.
//
// Indian GSTIN format: first 2 chars = state code (e.g. "29" = Karnataka).
// Supplier & customer in the SAME state → CGST + SGST (each = tax/2)
// Different state                        → IGST (full tax)

import { round2 } from './sequence'

// Extract the 2-digit state code from a GSTIN. Returns null if invalid.
export function getStateCode(gstin) {
  if (!gstin || typeof gstin !== 'string') return null
  const code = gstin.trim().slice(0, 2)
  return /^\d{2}$/.test(code) ? code : null
}

// Decide tax type for a transaction.
// supplierGstin = org GSTIN  |  customerGstin = customer/vendor GSTIN
// Returns 'intra' (CGST+SGST), 'inter' (IGST), or 'intra' as default if we
// can't determine (safer fallback — splits the tax into two halves).
export function determineTaxType(supplierGstin, customerGstin) {
  const s = getStateCode(supplierGstin)
  const c = getStateCode(customerGstin)
  if (!s || !c) return 'intra'
  return s === c ? 'intra' : 'inter'
}

// Split a tax rate percentage into CGST/SGST/IGST rates based on tax type.
//   splitRate(18, 'intra') → { cgst: 9,  sgst: 9,  igst: 0  }
//   splitRate(18, 'inter') → { cgst: 0,  sgst: 0,  igst: 18 }
export function splitRate(totalRatePct, taxType) {
  const rate = Number(totalRatePct) || 0
  if (taxType === 'inter') return { cgst: 0, sgst: 0, igst: rate }
  return { cgst: rate / 2, sgst: rate / 2, igst: 0 }
}

// Split an amount of tax into CGST/SGST/IGST.
export function splitAmount(totalTaxAmt, taxType) {
  const amt = round2(Number(totalTaxAmt) || 0)
  if (taxType === 'inter') return { cgst: 0, sgst: 0, igst: amt }
  const half = round2(amt / 2)
  return { cgst: half, sgst: round2(amt - half), igst: 0 } // ensure sum exactly equals amt
}

// Compute full totals with GST split for a set of line items.
// lineItems: [{ qty, rate, tax }]
// Returns { items (with .amount), subtotal, taxTotal, cgstTotal, sgstTotal, igstTotal, total, taxType }
export function computeWithGst(lineItems = [], { supplierGstin, customerGstin, taxType } = {}) {
  const type = taxType || determineTaxType(supplierGstin, customerGstin)
  let subtotal = 0
  let cgst = 0, sgst = 0, igst = 0
  const items = lineItems.map(item => {
    const qty   = Number(item.qty)   || 0
    const rate  = Number(item.rate)  || 0
    const hours = Number(item.hours) || 1
    const tax   = Number(item.tax)   || 0
    const amount = round2(qty * hours * rate)
    const lineTax = round2((amount * tax) / 100)
    const s = splitAmount(lineTax, type)
    cgst += s.cgst
    sgst += s.sgst
    igst += s.igst
    subtotal += amount
    return { ...item, amount }
  })
  subtotal = round2(subtotal)
  cgst = round2(cgst); sgst = round2(sgst); igst = round2(igst)
  const taxTotal = round2(cgst + sgst + igst)
  const total = round2(subtotal + taxTotal)
  return { items, subtotal, taxTotal, cgstTotal: cgst, sgstTotal: sgst, igstTotal: igst, total, taxType: type }
}
