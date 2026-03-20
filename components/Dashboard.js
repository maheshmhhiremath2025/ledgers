import { useState, useEffect, useRef } from 'react'
import { Card, Badge, fmt, fmtDate } from './ui'

// ── Tiny helpers ──
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0

function Stat({ label, value, sub, color, icon, onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--border-2)' }}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at top right, ${color}12, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--r)', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', fontFamily: 'var(--mono)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Revenue bar chart (pure SVG — no library needed) ──
function RevenueChart({ data }) {
  if (!data?.length) return null
  const W = 600, H = 180, PAD = { top: 16, right: 12, bottom: 32, left: 52 }
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.collected)), 1)
  const round  = v => Math.ceil(v / 10000) * 10000
  const yMax   = round(maxVal * 1.15)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top  - PAD.bottom
  const bw     = Math.floor(innerW / data.length * 0.35)
  const gap    = Math.floor(innerW / data.length)

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ val: yMax * t, y: PAD.top + innerH * (1 - t) }))
  const barY   = (v) => PAD.top + innerH * (1 - v / yMax)
  const barH   = (v) => innerH * (v / yMax)

  const formatK = v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Y-axis grid & labels */}
      {yTicks.map(t => (
        <g key={t.val}>
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray={t.val === 0 ? 'none' : '3 3'} />
          <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="var(--text-4)" fontFamily="var(--mono)">{formatK(t.val)}</text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const cx = PAD.left + i * gap + gap / 2
        const rY = barY(d.revenue); const rH = barH(d.revenue)
        const cY = barY(d.collected); const cH = barH(d.collected)
        return (
          <g key={i}>
            {/* Revenue bar */}
            {d.revenue > 0 && (
              <rect x={cx - bw - 2} y={rY} width={bw} height={rH} rx="3" fill="#6366F1" opacity="0.85" />
            )}
            {/* Collected bar */}
            {d.collected > 0 && (
              <rect x={cx + 2} y={cY} width={bw} height={cH} rx="3" fill="#10B981" opacity="0.85" />
            )}
            {/* X label */}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--text-3)" fontFamily="var(--font)">{d.label}</text>
          </g>
        )
      })}

      {/* Legend */}
      <rect x={PAD.left} y={4} width={10} height={10} rx="2" fill="#6366F1" opacity="0.85" />
      <text x={PAD.left + 14} y={13} fontSize="10" fill="var(--text-3)" fontFamily="var(--font)">Invoiced</text>
      <rect x={PAD.left + 72} y={4} width={10} height={10} rx="2" fill="#10B981" opacity="0.85" />
      <text x={PAD.left + 86} y={13} fontSize="10" fill="var(--text-3)" fontFamily="var(--font)">Collected</text>
    </svg>
  )
}

// ── Donut chart (invoice status breakdown) ──
function DonutChart({ byStatus }) {
  const COLORS = { Paid: '#10B981', Sent: '#3B82F6', Due: '#F59E0B', Draft: '#F59E0B', Overdue: '#EF4444', Cancelled: '#636880' }
  const entries = Object.entries(byStatus || {}).filter(([, v]) => v.count > 0)
  if (!entries.length) return <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 12 }}>No data</div>

  const total = entries.reduce((s, [, v]) => s + v.total, 0)
  const R = 44, CX = 56, CY = 56, SW = 16
  let angle = -Math.PI / 2

  const arcs = entries.map(([status, val]) => {
    const sweep = (val.total / total) * 2 * Math.PI
    const x1 = CX + R * Math.cos(angle)
    const y1 = CY + R * Math.sin(angle)
    angle += sweep
    const x2 = CX + R * Math.cos(angle)
    const y2 = CY + R * Math.sin(angle)
    const lg = sweep > Math.PI ? 1 : 0
    return { status, val, d: `M${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2}`, color: COLORS[status] || '#636880' }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width="112" height="112" viewBox="0 0 112 112" style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={SW} strokeLinecap="butt" opacity="0.9" />
        ))}
        <text x="56" y="52" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{entries.reduce((s, [,v]) => s + v.count, 0)}</text>
        <text x="56" y="66" textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="var(--font)">invoices</text>
      </svg>
      <div>
        {arcs.map(a => (
          <div key={a.status} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 5, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-2)' }}>{a.status === 'Draft' ? 'Due' : a.status}</span>
            </div>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 11 }}>{fmt(a.val.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ──
export default function Dashboard({ org, headers, toast, onNavigate }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/dashboard/summary', { headers })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [org.id])

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
      {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 'var(--r-lg)' }} />)}
    </div>
  )
  if (!data) return null

  const { invoices, purchaseOrders, fy, chartData, topCustomers, recentInvoices, recentPayments } = data
  const collectionRate = pct(invoices.paid, invoices.total)

  return (
    <div>
      {/* FY banner */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>Overview</h2>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {org.name} · {(() => { const now = new Date(); const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1; return `FY ${y}–${String(y+1).slice(2)}` })()}
          </div>
        </div>
        <button onClick={() => window.location.reload()} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>↻ Refresh</button>
      </div>

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <Stat label="FY Revenue"    value={fmt(fy.revenue)}     sub={`${collectionRate}% collected`}        color="#6366F1" icon="📈" onClick={() => onNavigate('invoices')} />
        <Stat label="Cash Position" value={fmt(fy.cashBalance)} sub="Cash & equivalents"                    color="#10B981" icon="🏦" onClick={() => onNavigate('ledgers')} />
        <Stat label="Outstanding"   value={fmt(invoices.outstanding)} sub={`${invoices.overdue} overdue`}   color={invoices.overdue > 0 ? '#EF4444' : '#F59E0B'} icon="⏳" onClick={() => onNavigate('invoices')} />
        <Stat label="Net Profit"    value={fmt(fy.netProfit)}   sub="Income − Expenses"                     color={fy.netProfit >= 0 ? '#10B981' : '#EF4444'} icon="💰" onClick={() => onNavigate('ledgers')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <Stat label="Total Invoices"    value={invoices.count}            sub={`₹${(invoices.total/100000).toFixed(1)}L total value`}      color="#818CF8" icon="📄" onClick={() => onNavigate('invoices')} />
        <Stat label="Purchase Orders"   value={purchaseOrders.count}      sub={fmt(purchaseOrders.total) + ' total'}                        color="#5EEAD4" icon="📦" onClick={() => onNavigate('purchase-orders')} />
        <Stat label="Collected"         value={fmt(invoices.paid)}         sub={`${collectionRate}% of invoiced`}                           color="#6EE7B7" icon="✅" onClick={() => onNavigate('payments')} />
        <Stat label="AR Balance"        value={fmt(fy.arBalance)}          sub="Accounts receivable"                                        color="#93C5FD" icon="📋" onClick={() => onNavigate('ledgers')} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Revenue trend */}
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Revenue trend</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Last 6 months</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent-2)' }}>
              {fmt(chartData.reduce((s, d) => s + d.revenue, 0))}
            </div>
          </div>
          <RevenueChart data={chartData} />
        </Card>

        {/* Invoice breakdown donut */}
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Invoice breakdown</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>By status</div>
          <DonutChart byStatus={invoices.byStatus} />
          {/* Collection rate bar */}
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
              <span>Collection rate</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--green-text)' }}>{collectionRate}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${collectionRate}%`, background: 'var(--green)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Top customers */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Top customers</div>
          {topCustomers?.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '20px 0' }}>No data yet</div>
            : topCustomers?.map((c, i) => {
              const maxTotal = topCustomers[0]?.total || 1
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `hsl(${i * 47 + 220}, 70%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                        {(c._id || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ color: 'var(--text-2)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c._id || 'Unknown'}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)', fontSize: 11 }}>{fmt(c.total)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct(c.total, maxTotal)}%`, background: `hsl(${i * 47 + 220}, 70%, 45%)`, borderRadius: 99, opacity: 0.8 }} />
                  </div>
                </div>
              )
            })
          }
        </Card>

        {/* Recent invoices */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Recent invoices</div>
            <button onClick={() => onNavigate('invoices')} style={{ fontSize: 11, color: 'var(--accent-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>View all →</button>
          </div>
          {recentInvoices?.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '20px 0' }}>No invoices yet</div>
            : recentInvoices?.slice(0, 5).map(inv => (
              <div key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-2)', fontWeight: 600 }}>{inv.invoiceNumber}</span>
                    <Badge status={inv.status === 'Draft' ? 'Due' : inv.status} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{inv.customer?.name || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{fmt(inv.total)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{fmtDate(inv.issueDate)}</div>
                </div>
              </div>
            ))
          }
        </Card>

        {/* Recent payments */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Recent payments</div>
            <button onClick={() => onNavigate('payments')} style={{ fontSize: 11, color: 'var(--accent-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>View all →</button>
          </div>
          {recentPayments?.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '20px 0' }}>No payments recorded yet</div>
            : recentPayments?.map(pmt => (
              <div key={pmt._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: pmt.type === 'Receipt' ? 'var(--green-text)' : 'var(--red-text)', fontWeight: 600 }}>{pmt.paymentNumber}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: pmt.type === 'Receipt' ? 'var(--green-dim)' : 'var(--red-dim)', color: pmt.type === 'Receipt' ? 'var(--green-text)' : 'var(--red-text)' }}>{pmt.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{pmt.party?.name || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: pmt.type === 'Receipt' ? 'var(--green-text)' : 'var(--red-text)' }}>{fmt(pmt.amount)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{fmtDate(pmt.paymentDate)}</div>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* Overdue alert */}
      {invoices.overdue > 0 && (
        <div onClick={() => onNavigate('invoices')} className="fade-up" style={{ marginTop: 16, padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red-text)' }}>
              {invoices.overdue} overdue invoice{invoices.overdue > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Click to view and follow up with customers</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--red-text)', fontWeight: 600 }}>View →</div>
        </div>
      )}
    </div>
  )
}