import { useState, useEffect } from 'react'
import { Badge, Btn, SearchBar, Card, EmptyState, fmt, fmtDate } from './ui'

const TYPE_COLORS = {
  Asset:     { color: 'var(--blue-text)',  bg: 'var(--blue-dim)' },
  Liability: { color: 'var(--red-text)',   bg: 'var(--red-dim)' },
  Equity:    { color: 'var(--teal-text)',  bg: 'var(--teal-dim)' },
  Income:    { color: 'var(--green-text)', bg: 'var(--green-dim)' },
  Expense:   { color: 'var(--amber-text)', bg: 'var(--amber-dim)' },
}

function TypeBadge({ type }) {
  const s = TYPE_COLORS[type] || {}
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>
      {type}
    </span>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 16px', minWidth: 130, flexShrink: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}

// General Ledger drill-down for one account
function LedgerDrillDown({ account, headers, onBack }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ limit: 100 })
    if (from) p.set('from', from)
    if (to)   p.set('to', to)
    fetch(`/api/journal?${p}`, { headers })
      .then(r => r.json())
      .then(d => {
        // Filter entries that have a line for this account
        const relevant = (d.entries || []).filter(e =>
          e.lines?.some(l => String(l.accountId) === String(account._id) ||
            l.accountCode === account.code)
        )
        setEntries(relevant)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [account._id, from, to])

  let runningBalance = 0
  const normalDebit = ['Asset', 'Expense'].includes(account.type)

  const rows = entries.flatMap(e =>
    e.lines
      .filter(l => String(l.accountId) === String(account._id) || l.accountCode === account.code)
      .map(l => {
        const delta = normalDebit
          ? (l.debit || 0) - (l.credit || 0)
          : (l.credit || 0) - (l.debit || 0)
        runningBalance += delta
        return { e, l, balance: runningBalance }
      })
  )

  const tc = TYPE_COLORS[account.type] || {}

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Btn variant="ghost" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
        <div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', marginRight: 8 }}>{account.code}</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{account.name}</span>
          <span style={{ marginLeft: 8 }}><TypeBadge type={account.type} /></span>
        </div>
      </div>

      {/* Account summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        <Card style={{ padding: 16, background: tc.bg, border: `1px solid ${tc.color}30` }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Current Balance</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: tc.color }}>{fmt(account.balance || 0)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{account.type} · {account.group}</div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Total Debits</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--blue-text)' }}>
            {fmt(rows.reduce((s, r) => s + (r.l.debit || 0), 0))}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Total Credits</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--green-text)' }}>
            {fmt(rows.reduce((s, r) => s + (r.l.credit || 0), 0))}
          </div>
        </Card>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>From</span>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>To</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }} />
        {(from || to) && <Btn size="sm" onClick={() => { setFrom(''); setTo('') }}>Clear</Btn>}
      </div>

      {/* Ledger table */}
      <Card>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading transactions…</div>
        ) : rows.length === 0 ? (
          <EmptyState message="No transactions found for this account yet." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Entry #', 'Narration', 'Ref', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: i >= 4 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-2)', fontSize: 12 }}>{fmtDate(row.e.date)}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-2)' }}>{row.e.entryNumber}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{row.e.narration}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>{row.e.reference || '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--blue-text)' }}>{row.l.debit  ? fmt(row.l.debit)  : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green-text)' }}>{row.l.credit ? fmt(row.l.credit) : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: row.balance >= 0 ? tc.color : 'var(--red-text)' }}>{fmt(Math.abs(row.balance))}{row.balance < 0 ? ' Cr' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

// Journal entries list
function JournalList({ headers }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ limit: 50 })
    if (search) p.set('search', search)
    fetch(`/api/journal?${p}`, { headers })
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search journal entries…" />
      </div>
      <Card>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
        ) : entries.length === 0 ? (
          <EmptyState message="No journal entries yet. They are created automatically when you send invoices and record payments." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Entry #', 'Date', 'Narration', 'Ref', 'Type', 'Debit', 'Credit'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: i >= 5 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const totalDebit = e.lines.reduce((s, l) => s + (l.debit || 0), 0)
                return (
                  <tr key={e._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={el => el.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={el => el.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-2)', fontWeight: 600 }}>{e.entryNumber}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)', fontSize: 12 }}>{fmtDate(e.date)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text)', maxWidth: 280 }}>
                      <div>{e.narration}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        {e.lines.map(l => `${l.accountCode} ${l.accountName}`).join(' · ')}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>{e.reference || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: e.sourceType === 'Invoice' ? 'var(--blue-dim)' : e.sourceType === 'Payment' ? 'var(--green-dim)' : 'var(--surface-3)', color: e.sourceType === 'Invoice' ? 'var(--blue-text)' : e.sourceType === 'Payment' ? 'var(--green-text)' : 'var(--text-3)' }}>
                        {e.sourceType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--blue-text)' }}>{fmt(totalDebit)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green-text)' }}>{fmt(totalDebit)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

export default function AccountsList({ org, headers, toast }) {
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTF]       = useState('')
  const [drillDown, setDrillDown] = useState(null)
  const [activeTab, setActiveTab] = useState('accounts')
  const [syncing, setSyncing]     = useState(false)

  const loadAccounts = () => {
    setLoading(true)
    fetch('/api/accounts', { headers })
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || d || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadAccounts() }, [org.id])

  const syncLedgers = async () => {
    setSyncing(true)
    try {
      const r = await fetch('/api/journal/backfill', { method: 'POST', headers })
      const d = await r.json()
      if (r.ok) { toast(d.message); loadAccounts() }
      else toast(d.error || 'Sync failed', 'error')
    } catch { toast('Sync failed', 'error') }
    setSyncing(false)
  }

  if (drillDown) {
    return <LedgerDrillDown account={drillDown} headers={headers} onBack={() => { setDrillDown(null); loadAccounts() }} />
  }

  const filtered = accounts.filter(a =>
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code?.includes(search)) &&
    (!typeFilter || a.type === typeFilter)
  )

  // Group by type
  const grouped = {}
  filtered.forEach(a => { if (!grouped[a.type]) grouped[a.type] = []; grouped[a.type].push(a) })

  // Summary stats
  const totalAssets      = accounts.filter(a => a.type === 'Asset').reduce((s, a) => s + (a.balance || 0), 0)
  const totalLiabilities = accounts.filter(a => a.type === 'Liability').reduce((s, a) => s + (a.balance || 0), 0)
  const totalIncome      = accounts.filter(a => a.type === 'Income').reduce((s, a) => s + (a.balance || 0), 0)
  const totalExpenses    = accounts.filter(a => a.type === 'Expense').reduce((s, a) => s + (a.balance || 0), 0)
  const netProfit        = totalIncome - totalExpenses

  return (
    <div>
      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatPill label="Assets"      value={fmt(totalAssets)}      color="var(--blue-text)" />
        <StatPill label="Liabilities" value={fmt(totalLiabilities)} color="var(--red-text)" />
        <StatPill label="Income"      value={fmt(totalIncome)}      color="var(--green-text)" />
        <StatPill label="Expenses"    value={fmt(totalExpenses)}    color="var(--amber-text)" />
        <StatPill label="Net Profit"  value={fmt(netProfit)}        color={netProfit >= 0 ? 'var(--green-text)' : 'var(--red-text)'} />
      </div>

      {/* Sync button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <Btn size="sm" onClick={syncLedgers} disabled={syncing}>
          {syncing ? '⟳ Syncing…' : '⟳ Sync Ledgers from Invoices & Payments'}
        </Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 3, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[{ id: 'accounts', label: 'Chart of Accounts' }, { id: 'journal', label: 'Journal Entries' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '7px 16px', border: 'none', borderRadius: 'var(--r)',
            background: activeTab === t.id ? 'var(--surface-3)' : 'transparent',
            color: activeTab === t.id ? 'var(--text)' : 'var(--text-3)',
            fontWeight: activeTab === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.12s', fontFamily: 'var(--font)',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'journal' && <JournalList headers={headers} />}

      {activeTab === 'accounts' && (
        <Card>
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search accounts…" />
            <select value={typeFilter} onChange={e => setTF(e.target.value)} style={{ padding: '7px 11px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)' }}>
              <option value="">All types</option>
              {['Asset','Liability','Equity','Income','Expense'].map(t => <option key={t} value={t} style={{ background: 'var(--bg-2)' }}>{t}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading accounts…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Code', 'Account Name', 'Type', 'Group', 'Balance'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: i === 4 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([type, accs]) => (
                  <>
                    <tr key={`group-${type}`}>
                      <td colSpan={5} style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                        {type === 'Asset' ? 'Assets' : type === 'Liability' ? 'Liabilities' : type + 's'}
                      </td>
                    </tr>
                    {accs.map(a => (
                      <tr key={a._id} onClick={() => setDrillDown(a)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '11px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{a.code}</td>
                        <td style={{ padding: '11px 14px', fontWeight: 500, color: 'var(--text)' }}>{a.name}</td>
                        <td style={{ padding: '11px 14px' }}><TypeBadge type={a.type} /></td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-3)', fontSize: 12 }}>{a.group}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: (a.balance || 0) !== 0 ? TYPE_COLORS[a.type]?.color : 'var(--text-4)' }}>
                          {fmt(a.balance || 0)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{accounts.length} accounts · Click any row to view general ledger</span>
            <span style={{ color: 'var(--text-4)' }}>Journal entries are auto-created when you send invoices & record payments</span>
          </div>
        </Card>
      )}
    </div>
  )
}