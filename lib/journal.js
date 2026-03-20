import { connectDB } from './mongodb'
import Account from '../models/Account'
import JournalEntry from '../models/JournalEntry'

// Default account codes used for auto-posting
const CODES = {
  cashEquivalents:    '1010', // Asset - Cash & Cash Equivalents
  accountsReceivable: '1020', // Asset - Accounts Receivable
  accountsPayable:    '2010', // Liability - Accounts Payable
  serviceRevenue:     '4020', // Income - Service Revenue
  productRevenue:     '4010', // Income - Product Revenue
  costOfRevenue:      '5010', // Expense - Cost of Goods Sold
}

// Find account by code for this org, create if missing
async function getAccount(orgId, code) {
  let acc = await Account.findOne({ orgId, code })
  if (!acc) {
    // Fallback: find any account of appropriate type
    const typeMap = {
      '1010': 'Asset', '1020': 'Asset', '2010': 'Liability',
      '4010': 'Income', '4020': 'Income', '5010': 'Expense',
    }
    acc = await Account.findOne({ orgId, type: typeMap[code] })
  }
  return acc
}

// Get next journal entry number
async function nextEntryNumber(orgId) {
  const count = await JournalEntry.countDocuments({ orgId })
  return `JE-${String(count + 1).padStart(5, '0')}`
}

// Post a journal entry and update account balances
export async function postJournalEntry(orgId, { date, narration, reference, sourceType, sourceId, lines, currency = 'INR' }) {
  await connectDB()

  // Validate debits == credits
  const totalDebit  = lines.reduce((s, l) => s + (l.debit  || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal entry imbalanced: debits ${totalDebit} ≠ credits ${totalCredit}`)
  }

  const entryNumber = await nextEntryNumber(orgId)

  const entry = await JournalEntry.create({
    orgId, entryNumber, date: date || new Date(),
    narration, reference, sourceType, sourceId,
    status: 'Posted', lines, currency,
  })

  // Update account balances
  for (const line of lines) {
    if (!line.accountId) continue
    const acc = await Account.findById(line.accountId)
    if (!acc) continue

    // Normal balance rules:
    // Assets & Expenses: debit increases, credit decreases
    // Liabilities, Equity, Income: credit increases, debit decreases
    const normalDebit = ['Asset', 'Expense'].includes(acc.type)
    const delta = normalDebit
      ? (line.debit || 0) - (line.credit || 0)
      : (line.credit || 0) - (line.debit || 0)

    await Account.findByIdAndUpdate(line.accountId, { $inc: { balance: delta } })
  }

  return entry
}

// Auto-post when invoice is marked as SENT (raise AR + Revenue)
export async function postInvoiceRaised(orgId, invoice) {
  try {
    await connectDB()
    const [arAcc, revAcc] = await Promise.all([
      getAccount(orgId, CODES.accountsReceivable),
      getAccount(orgId, CODES.serviceRevenue),
    ])
    if (!arAcc || !revAcc) return null

    return await postJournalEntry(orgId, {
      date: invoice.issueDate || new Date(),
      narration: `Invoice raised: ${invoice.invoiceNumber} — ${invoice.customer?.name}`,
      reference: invoice.invoiceNumber,
      sourceType: 'Invoice',
      sourceId: invoice._id,
      currency: invoice.currency || 'INR',
      lines: [
        { accountId: arAcc._id,  accountCode: arAcc.code,  accountName: arAcc.name,  debit: invoice.total,  credit: 0,             narration: 'Accounts Receivable' },
        { accountId: revAcc._id, accountCode: revAcc.code, accountName: revAcc.name, debit: 0,              credit: invoice.total, narration: 'Service Revenue' },
      ],
    })
  } catch (e) {
    console.error('postInvoiceRaised error:', e.message)
    return null
  }
}

// Auto-post when payment is received (DR Cash, CR AR)
export async function postPaymentReceived(orgId, payment, invoice) {
  try {
    await connectDB()
    const [cashAcc, arAcc] = await Promise.all([
      getAccount(orgId, CODES.cashEquivalents),
      getAccount(orgId, CODES.accountsReceivable),
    ])
    if (!cashAcc || !arAcc) return null

    const amount = payment.amount || 0
    return await postJournalEntry(orgId, {
      date: payment.paymentDate || new Date(),
      narration: `Payment received: ${payment.paymentNumber}${invoice ? ` for ${invoice.invoiceNumber}` : ''}`,
      reference: payment.paymentNumber,
      sourceType: 'Payment',
      sourceId: payment._id,
      currency: payment.currency || 'INR',
      lines: [
        { accountId: cashAcc._id, accountCode: cashAcc.code, accountName: cashAcc.name, debit: amount, credit: 0,      narration: 'Cash received' },
        { accountId: arAcc._id,   accountCode: arAcc.code,   accountName: arAcc.name,   debit: 0,      credit: amount, narration: 'Accounts Receivable cleared' },
      ],
    })
  } catch (e) {
    console.error('postPaymentReceived error:', e.message)
    return null
  }
}

// Auto-post when PO payment is made (DR AP, CR Cash)
export async function postPaymentMade(orgId, payment) {
  try {
    await connectDB()
    const [apAcc, cashAcc] = await Promise.all([
      getAccount(orgId, CODES.accountsPayable),
      getAccount(orgId, CODES.cashEquivalents),
    ])
    if (!apAcc || !cashAcc) return null

    const amount = payment.amount || 0
    return await postJournalEntry(orgId, {
      date: payment.paymentDate || new Date(),
      narration: `Payment made: ${payment.paymentNumber}`,
      reference: payment.paymentNumber,
      sourceType: 'Payment',
      sourceId: payment._id,
      currency: payment.currency || 'INR',
      lines: [
        { accountId: apAcc._id,   accountCode: apAcc.code,   accountName: apAcc.name,   debit: amount, credit: 0,      narration: 'Accounts Payable cleared' },
        { accountId: cashAcc._id, accountCode: cashAcc.code, accountName: cashAcc.name, debit: 0,      credit: amount, narration: 'Cash paid' },
      ],
    })
  } catch (e) {
    console.error('postPaymentMade error:', e.message)
    return null
  }
}