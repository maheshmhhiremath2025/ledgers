import { useState, useEffect } from 'react'
import { Card, SectionTitle, fmt } from './ui'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Mini bar chart ──
function MiniChart({ data, h = 140 }) {
  if (!data?.length) return null
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue || 0, d.expenses || 0)), 1)
  const W = 580, PAD = { top: 10, bottom: 28, left: 40, right: 8 }
  const innerW = W - PAD.left - PAD.right
  const innerH = h - PAD.top - PAD.bottom
  const bw = Math.floor(innerW / data.length * 0.28)
  const gap = Math.floor(innerW / data.length)
  const barY = v => PAD.top + innerH * (1 - v / maxVal)
  const barH = v => innerH * (v / maxVal)
  const fmtK = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`

  const yTicks = [0, 0.5, 1].map(t => ({ val: maxVal * t, y: PAD.top + innerH * (1 - t) }))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${h}`}>
      {yTicks.map(t => (
        <g key={t.val}>
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray={t.val > 0 ? '3 3' : 'none'} />
          <text x={PAD.left - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--text-4)" fontFamily="var(--mono)">{fmtK(t.val)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = PAD.left + i * gap + gap / 2
        return (
          <g key={i}>
            {(d.revenue || 0) > 0 && <rect x={cx - bw - 1} y={barY(d.revenue)} width={bw} height={barH(d.revenue)} rx="2" fill="#6366F1" opacity="0.85" />}
            {(d.expenses || 0) > 0 && <rect x={cx + 1} y={barY(d.expenses)} width={bw} height={barH(d.expenses)} rx="2" fill="#EF4444" opacity="0.75" />}
            <text x={cx} y={h - 6} textAnchor="middle" fontSize="9" fill="var(--text-3)" fontFamily="var(--font)">{d.label}</text>
          </g>
        )
      })}
      <rect x={PAD.left} y={3} width={8} height={8} rx="1" fill="#6366F1" opacity="0.85" />
      <text x={PAD.left + 12} y={11} fontSize="9" fill="var(--text-3)" fontFamily="var(--font)">Revenue</text>
      <rect x={PAD.left + 68} y={3} width={8} height={8} rx="1" fill="#EF4444" opacity="0.75" />
      <text x={PAD.left + 82} y={11} fontSize="9" fill="var(--text-3)" fontFamily="var(--font)">Expenses</text>
    </svg>
  )
}

// ── Table helper ──
function ReportTable({ columns, rows, totals, zebra = true }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          {columns.map((c, i) => (
            <th key={c.key} style={{ padding: '8px 12px', textAlign: c.align || (i > 0 ? 'right' : 'left'), fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-3)', whiteSpace: 'nowrap' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: zebra && i % 2 === 1 ? 'rgba(255,255,255,0.01)' : '' }}>
            {columns.map((c, j) => (
              <td key={c.key} style={{ padding: '9px 12px', textAlign: c.align || (j > 0 ? 'right' : 'left'), fontFamily: c.mono ? 'var(--mono)' : 'var(--font)', color: c.color ? c.color(row[c.key]) : j === 0 ? 'var(--text)' : 'var(--text-2)' }}>
                {c.render ? c.render(row[c.key], row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {totals && (
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border-3)', background: 'var(--bg-3)' }}>
            {columns.map((c, i) => (
              <td key={c.key} style={{ padding: '10px 12px', textAlign: c.align || (i > 0 ? 'right' : 'left'), fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>
                {totals[c.key] !== undefined ? totals[c.key] : ''}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  )
}

// ── Export to CSV ──
function exportCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// ── P&L Report ──
function PLReport({ data }) {
  if (!data) return null
  const { income = [], expenses = [], summary = {}, monthlyData = [], period, org } = data

  const doExport = () => {
    const headers = ['Code', 'Account', 'Group', 'Amount']
    const rows = [
      ['', 'INCOME', '', ''],
      ...income.map(a => [a.code, a.name, a.group, a.balance.toFixed(2)]),
      ['', 'Total Income', '', summary.totalIncome.toFixed(2)],
      ['', '', '', ''],
      ['', 'EXPENSES', '', ''],
      ...expenses.map(a => [a.code, a.name, a.group, a.balance.toFixed(2)]),
      ['', 'Total Expenses', '', summary.totalExpenses.toFixed(2)],
      ['', '', '', ''],
      ['', 'NET PROFIT', '', summary.netProfit.toFixed(2)],
    ]
    exportCSV(`PL_${period.replace(/\s/g,'_')}.csv`, headers, rows)
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Revenue',   value: fmt(summary.totalIncome),   color: 'var(--green-text)' },
          { label: 'Total Expenses',  value: fmt(summary.totalExpenses),  color: 'var(--red-text)' },
          { label: 'Net Profit',      value: fmt(summary.netProfit),      color: summary.netProfit >= 0 ? 'var(--green-text)' : 'var(--red-text)' },
          { label: 'Gross Margin',    value: `${summary.grossMargin}%`,   color: summary.grossMargin >= 30 ? 'var(--green-text)' : summary.grossMargin >= 10 ? 'var(--amber-text)' : 'var(--red-text)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      {monthlyData?.length > 0 && (
        <Card style={{ padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionTitle>Monthly trend — {period}</SectionTitle>
          </div>
          <MiniChart data={monthlyData} />
        </Card>
      )}

      {/* Income table */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>Income</SectionTitle>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--green-text)' }}>{fmt(summary.totalIncome)}</span>
        </div>
        <ReportTable
          columns={[
            { key: 'code',    label: 'Code',    mono: true },
            { key: 'name',    label: 'Account', align: 'left' },
            { key: 'group',   label: 'Group',   align: 'left' },
            { key: 'balance', label: 'Amount',  mono: true, render: v => fmt(v), color: () => 'var(--green-text)' },
          ]}
          rows={income}
          totals={{ code: '', name: 'Total Income', group: '', balance: fmt(summary.totalIncome) }}
        />
      </Card>

      {/* Expenses table */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>Expenses</SectionTitle>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--red-text)' }}>{fmt(summary.totalExpenses)}</span>
        </div>
        <ReportTable
          columns={[
            { key: 'code',    label: 'Code',    mono: true },
            { key: 'name',    label: 'Account', align: 'left' },
            { key: 'group',   label: 'Group',   align: 'left' },
            { key: 'balance', label: 'Amount',  mono: true, render: v => fmt(v), color: () => 'var(--red-text)' },
          ]}
          rows={expenses}
          totals={{ code: '', name: 'Total Expenses', group: '', balance: fmt(summary.totalExpenses) }}
        />
      </Card>

      {/* Net profit footer */}
      <div style={{ padding: '16px 20px', background: summary.netProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${summary.netProfit >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 'var(--r-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Net Profit / (Loss)</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: summary.netProfit >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>{fmt(Math.abs(summary.netProfit))}{summary.netProfit < 0 ? ' (Loss)' : ''}</span>
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={doExport} style={{ padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          ⬇ Export CSV
        </button>
      </div>
    </div>
  )
}

// ── Balance Sheet ──
function BSReport({ data }) {
  if (!data) return null
  const { assets = [], liabilities = [], equity = [], summary = {}, period, org } = data

  const groupBy = (arr, field) => {
    const g = {}
    arr.forEach(a => { if (!g[a[field]]) g[a[field]] = []; g[a[field]].push(a) })
    return g
  }

  const renderGroup = (items, colorVar) => {
    const grouped = groupBy(items, 'group')
    return Object.entries(grouped).map(([grp, accs]) => (
      <div key={grp}>
        <div style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg)' }}>{grp}</div>
        {accs.map(a => (
          <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-4)' }}>{a.code}</span>
              <span style={{ color: 'var(--text-2)' }}>{a.name}</span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: colorVar }}>{fmt(a.balance)}</span>
          </div>
        ))}
      </div>
    ))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Assets',      value: fmt(summary.totalAssets),             color: 'var(--blue-text)' },
          { label: 'Total Liabilities', value: fmt(summary.totalLiabilities),         color: 'var(--red-text)' },
          { label: 'Net Worth',         value: fmt(summary.totalEquity + summary.retainedEarnings), color: 'var(--green-text)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Assets */}
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <SectionTitle>Assets</SectionTitle>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue-text)', fontSize: 13 }}>{fmt(summary.totalAssets)}</span>
          </div>
          {renderGroup(assets, 'var(--blue-text)')}
        </Card>

        {/* Liabilities + Equity */}
        <div>
          <Card style={{ overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <SectionTitle>Liabilities</SectionTitle>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red-text)', fontSize: 13 }}>{fmt(summary.totalLiabilities)}</span>
            </div>
            {renderGroup(liabilities, 'var(--red-text)')}
          </Card>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <SectionTitle>Equity</SectionTitle>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green-text)', fontSize: 13 }}>{fmt(summary.totalEquity + summary.retainedEarnings)}</span>
            </div>
            {renderGroup(equity, 'var(--teal-text)')}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-2)' }}>Retained Earnings (P&L)</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: summary.retainedEarnings >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>{fmt(summary.retainedEarnings)}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Balance check */}
      <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: 'var(--text-3)' }}>Assets = Liabilities + Equity</span>
        <span style={{ fontFamily: 'var(--mono)', color: Math.abs(summary.totalAssets - summary.totalEquityPlusLiabilities) < 1 ? 'var(--green-text)' : 'var(--red-text)', fontWeight: 600 }}>
          {fmt(summary.totalAssets)} = {fmt(summary.totalEquityPlusLiabilities)}
          {Math.abs(summary.totalAssets - summary.totalEquityPlusLiabilities) < 1 ? ' ✓' : ' ✗ Check journal entries'}
        </span>
      </div>
    </div>
  )
}

// ── Trial Balance ──
function TBReport({ data }) {
  if (!data) return null
  const { accounts = [], summary = {}, period } = data

  const doExport = () => {
    exportCSV(`TrialBalance_${period.replace(/\s/g,'_')}.csv`,
      ['Code', 'Account', 'Type', 'Group', 'Debit', 'Credit'],
      accounts.map(a => [a.code, a.name, a.type, a.group, a.debit.toFixed(2), a.credit.toFixed(2)])
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Debits',  value: fmt(summary.totalDebits),  color: 'var(--blue-text)' },
          { label: 'Total Credits', value: fmt(summary.totalCredits), color: 'var(--green-text)' },
          { label: 'Balanced',      value: summary.isBalanced ? '✓ Yes' : '✗ No', color: summary.isBalanced ? 'var(--green-text)' : 'var(--red-text)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <ReportTable
          columns={[
            { key: 'code',   label: 'Code',    mono: true },
            { key: 'name',   label: 'Account', align: 'left' },
            { key: 'type',   label: 'Type',    align: 'left' },
            { key: 'group',  label: 'Group',   align: 'left' },
            { key: 'debit',  label: 'Debit',   mono: true, render: v => v > 0 ? fmt(v) : '—', color: v => v > 0 ? 'var(--blue-text)' : 'var(--text-4)' },
            { key: 'credit', label: 'Credit',  mono: true, render: v => v > 0 ? fmt(v) : '—', color: v => v > 0 ? 'var(--green-text)' : 'var(--text-4)' },
          ]}
          rows={accounts}
          totals={{ code: '', name: 'Total', type: '', group: '', debit: fmt(summary.totalDebits), credit: fmt(summary.totalCredits) }}
        />
      </Card>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={doExport} style={{ padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>⬇ Export CSV</button>
      </div>
    </div>
  )
}

// ── GST Report ──
function GSTReport({ data }) {
  if (!data) return null
  const { summary = {}, gstr1 = { b2b: [], b2c: [], hsnSummary: [] }, gstr3b = { rateBreakdown: [] }, period = {}, org = {} } = data

  const doExportGSTR1 = () => {
    exportCSV(`GSTR1_${period.label.replace(/\s/g,'_')}.csv`,
      ['Customer GSTIN', 'Customer Name', 'Invoice No', 'Invoice Date', 'Invoice Value', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
      [...gstr1.b2b.map(r => [r.gstin, r.name, r.invoiceNumber, new Date(r.invoiceDate).toLocaleDateString('en-IN'), r.invoiceValue, r.taxableValue, r.cgst, r.sgst, r.igst]),
       ...gstr1.b2c.map(r => ['', r.name, r.invoiceNumber, new Date(r.invoiceDate).toLocaleDateString('en-IN'), r.invoiceValue, r.taxableValue, r.cgst, r.sgst, 0])]
    )
  }

  return (
    <div>
      {/* Org GSTIN banner */}
      {org.gstin ? (
        <div style={{ padding: '10px 16px', background: 'var(--green-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--r-md)', marginBottom: 16, display: 'flex', gap: 12, fontSize: 12 }}>
          <span style={{ color: 'var(--green-text)', fontWeight: 600 }}>Your GSTIN: <span style={{ fontFamily: 'var(--mono)' }}>{org.gstin}</span></span>
          <span style={{ color: 'var(--text-3)' }}>· {org.businessName} · Period: {period.label}</span>
        </div>
      ) : (
        <div style={{ padding: '10px 16px', background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--r-md)', marginBottom: 16, fontSize: 12, color: 'var(--amber-text)' }}>
          ⚠ Add your GSTIN in Configuration → Tax & GST to complete your GST reports
        </div>
      )}

      {/* GSTR-3B summary */}
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle>GSTR-3B Summary — {period.label}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 12 }}>
          {[
            { label: 'Total Invoices', value: summary.totalInvoices, mono: false },
            { label: 'Taxable Value',  value: fmt(summary.totalTaxable), color: 'var(--text)' },
            { label: 'CGST + SGST',   value: fmt(summary.totalCGST + summary.totalSGST), color: 'var(--amber-text)' },
            { label: 'Total Tax',     value: fmt(summary.totalTax), color: 'var(--red-text)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color: s.color || 'var(--accent-2)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tax rate breakdown */}
        {gstr3b.rateBreakdown?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, fontWeight: 500 }}>Tax Rate Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rate','Taxable Value','CGST','SGST','IGST','Total Tax'].map((h,i) => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: i > 0 ? 'right' : 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gstr3b.rateBreakdown.map(r => (
                  <tr key={r.rate} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text)' }}>{r.rate}%</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{fmt(r.taxableValue)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--amber-text)' }}>{fmt(r.cgst)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--amber-text)' }}>{fmt(r.sgst)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{fmt(r.igst)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red-text)' }}>{fmt(r.cgst + r.sgst + r.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* GSTR-1 B2B */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <SectionTitle>GSTR-1 — B2B Invoices (with GSTIN)</SectionTitle>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{gstr1.b2b.length} invoices</div>
          </div>
          <button onClick={doExportGSTR1} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 11, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>⬇ Export GSTR-1 CSV</button>
        </div>
        {gstr1.b2b.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>No B2B invoices this period (invoices where customer has GSTIN)</div>
          : <ReportTable
              columns={[
                { key: 'gstin',         label: 'Customer GSTIN', mono: true, align: 'left' },
                { key: 'name',          label: 'Customer',       align: 'left' },
                { key: 'invoiceNumber', label: 'Invoice #',      mono: true, align: 'left' },
                { key: 'invoiceDate',   label: 'Date',           render: v => new Date(v).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) },
                { key: 'taxableValue',  label: 'Taxable',        mono: true, render: v => fmt(v) },
                { key: 'cgst',          label: 'CGST',           mono: true, render: v => fmt(v), color: () => 'var(--amber-text)' },
                { key: 'sgst',          label: 'SGST',           mono: true, render: v => fmt(v), color: () => 'var(--amber-text)' },
                { key: 'invoiceValue',  label: 'Total',          mono: true, render: v => fmt(v), color: () => 'var(--text)' },
              ]}
              rows={gstr1.b2b}
              totals={{ gstin: '', name: 'Total', invoiceNumber: '', invoiceDate: '', taxableValue: fmt(summary.totalTaxable), cgst: fmt(summary.totalCGST), sgst: fmt(summary.totalSGST), invoiceValue: fmt(summary.totalValue) }}
            />
        }
      </Card>

      {/* HSN Summary */}
      {gstr1.hsnSummary?.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <SectionTitle>HSN / SAC Summary</SectionTitle>
          </div>
          <ReportTable
            columns={[
              { key: 'sac',          label: 'SAC Code',     mono: true, align: 'left' },
              { key: 'description',  label: 'Description',  align: 'left' },
              { key: 'taxableValue', label: 'Taxable Value', mono: true, render: v => fmt(v) },
              { key: 'cgst',         label: 'CGST',         mono: true, render: v => fmt(v), color: () => 'var(--amber-text)' },
              { key: 'sgst',         label: 'SGST',         mono: true, render: v => fmt(v), color: () => 'var(--amber-text)' },
              { key: 'value',        label: 'Total Value',  mono: true, render: v => fmt(v) },
            ]}
            rows={gstr1.hsnSummary}
          />
        </Card>
      )}
    </div>
  )
}

// ── Main Reports Page ──
const now = new Date()
const MONTHS_LIST = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
  return { value: `${d.getMonth()+1}:${d.getFullYear()}`, label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) }
})

export default function ReportsPage({ org, headers, toast }) {
  const [report, setReport]   = useState('pl')   // pl | bs | tb | gst
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [gstPeriod, setGstPeriod] = useState(MONTHS_LIST[0].value) // month:year

  const load = async (type, period) => {
    setLoading(true); setData(null)
    try {
      let url
      if (type === 'gst') {
        const [m, y] = (period || gstPeriod).split(':')
        url = `/api/reports/gst?month=${m}&year=${y}`
      } else {
        url = `/api/reports/financial?type=${type}`
      }
      const r = await fetch(url, { headers })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setData(d)
    } catch (e) { toast(e.message, 'error') }
    setLoading(false)
  }

  useEffect(() => { load(report) }, [report, org.id])

  const TABS = [
    { id: 'pl',  label: 'Profit & Loss',  icon: '📈' },
    { id: 'bs',  label: 'Balance Sheet',  icon: '⚖' },
    { id: 'tb',  label: 'Trial Balance',  icon: '📋' },
    { id: 'gst', label: 'GST Reports',    icon: '🇮🇳' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Financial Reports</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>P&L · Balance Sheet · Trial Balance · GST</p>
        </div>
        {report === 'gst' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Period:</span>
            <select value={gstPeriod} onChange={e => { setGstPeriod(e.target.value); load('gst', e.target.value) }}
              style={{ padding: '7px 11px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)' }}>
              {MONTHS_LIST.map(m => <option key={m.value} value={m.value} style={{ background: 'var(--bg-2)' }}>{m.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Report tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 3, border: '1px solid var(--border)', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setReport(t.id)} style={{
            padding: '8px 16px', border: 'none', borderRadius: 'var(--r)',
            background: report === t.id ? 'var(--surface-3)' : 'transparent',
            color: report === t.id ? 'var(--text)' : 'var(--text-3)',
            fontWeight: report === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.12s', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      )}

      {!loading && data && (
        <div className="fade-up">
          {report === 'pl'  && <PLReport  data={data} />}
          {report === 'bs'  && <BSReport  data={data} />}
          {report === 'tb'  && <TBReport  data={data} />}
          {report === 'gst' && <GSTReport data={data} />}
        </div>
      )}
    </div>
  )
}