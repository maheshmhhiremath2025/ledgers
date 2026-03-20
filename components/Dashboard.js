import { useState, useEffect, useRef } from 'react'
import { Card, Badge, fmt, fmtDate } from './ui'

const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0

// ── Stat card ──
function Stat({ label, value, sub, color, icon, onClick, trend }) {
  return (
    <div onClick={onClick} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px', cursor:onClick?'pointer':'default', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e=>{ if(onClick){e.currentTarget.style.borderColor='var(--border-2)';e.currentTarget.style.transform='translateY(-1px)'}}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none'}}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at top right, ${color}12, transparent 65%)`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>{label}</div>
        <div style={{ width:32, height:32, borderRadius:'var(--r)', background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{icon}</div>
      </div>
      <div style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', fontFamily:'var(--mono)' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ marginTop:8, fontSize:11, fontWeight:600, color:trend>=0?'var(--green-text)':'var(--red-text)' }}>
          {trend>=0?'↑':'↓'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  )
}

// ── Revenue + Expense bar chart ──
function RevenueChart({ data }) {
  if (!data?.length) return null
  const W=660, H=190, PAD={top:16,right:12,bottom:32,left:56}
  const maxVal = Math.max(...data.flatMap(d=>[d.revenue||0,d.collected||0,d.expenses||0]),1)
  const round  = v => Math.ceil(v/10000)*10000
  const yMax   = round(maxVal*1.18)
  const innerW = W-PAD.left-PAD.right
  const innerH = H-PAD.top-PAD.bottom
  const bw     = Math.floor(innerW/data.length*0.22)
  const gap    = Math.floor(innerW/data.length)
  const yTicks = [0,0.25,0.5,0.75,1].map(t=>({val:yMax*t,y:PAD.top+innerH*(1-t)}))
  const barY   = v => PAD.top+innerH*(1-v/yMax)
  const barH   = v => Math.max(innerH*(v/yMax),0)
  const fmtK   = v => v>=100000?`₹${(v/100000).toFixed(1)}L`:v>=1000?`₹${(v/1000).toFixed(0)}K`:`₹${v}`

  return (
    <div>
      <div style={{ display:'flex', gap:16, marginBottom:12, flexWrap:'wrap' }}>
        {[['#6366F1','Revenue (Invoiced)'],['#10B981','Collected'],['#EF4444','Expenses']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-2)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
            {l}
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
        {yTicks.map(t=>(
          <g key={t.val}>
            <line x1={PAD.left} y1={t.y} x2={W-PAD.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray={t.val===0?'none':'3 3'}/>
            <text x={PAD.left-6} y={t.y+4} textAnchor="end" fontSize="10" fill="var(--text-4)" fontFamily="var(--mono)">{fmtK(t.val)}</text>
          </g>
        ))}
        {data.map((d,i)=>{
          const cx=PAD.left+i*gap+gap/2
          return (
            <g key={i}>
              {d.revenue>0 && <rect x={cx-bw*1.6} y={barY(d.revenue)} width={bw} height={barH(d.revenue)} rx="3" fill="#6366F1" opacity="0.85"/>}
              {d.collected>0 && <rect x={cx-bw*0.5} y={barY(d.collected)} width={bw} height={barH(d.collected)} rx="3" fill="#10B981" opacity="0.85"/>}
              {d.expenses>0 && <rect x={cx+bw*0.6} y={barY(d.expenses)} width={bw} height={barH(d.expenses)} rx="3" fill="#EF4444" opacity="0.75"/>}
              <text x={cx} y={H-PAD.bottom+14} textAnchor="middle" fontSize="10" fill="var(--text-4)" fontFamily="var(--font)">{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Donut chart ──
function Donut({ data, total, label }) {
  if (!data?.length || !total) return <div style={{ textAlign:'center', padding:24, color:'var(--text-3)', fontSize:13 }}>No data</div>
  const COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#14B8A6']
  const R=54, CX=70, CY=70, stroke=18
  let cumAngle = -90
  const slices = data.map((d,i)=>{
    const angle = (d.total/total)*360
    const start = cumAngle; cumAngle += angle
    const startRad = (start*Math.PI)/180
    const endRad   = ((start+angle)*Math.PI)/180
    const x1=CX+R*Math.cos(startRad), y1=CY+R*Math.sin(startRad)
    const x2=CX+R*Math.cos(endRad),   y2=CY+R*Math.sin(endRad)
    const large = angle>180?1:0
    return { ...d, color:COLORS[i%COLORS.length], path:`M${CX} ${CY} L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} Z` }
  })
  return (
    <div style={{ display:'flex', gap:16, alignItems:'center' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ flexShrink:0 }}>
        {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} opacity="0.88"/>)}
        <circle cx={CX} cy={CY} r={R-stroke} fill="var(--surface)"/>
        <text x={CX} y={CY-4} textAnchor="middle" fontSize="11" fill="var(--text-3)" fontFamily="var(--font)">{label}</text>
        <text x={CX} y={CY+12} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{fmt(total)}</text>
      </svg>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
        {slices.map(s=>(
          <div key={s._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }}/>
              <span style={{ color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:90 }}>{s._id||'Other'}</span>
            </div>
            <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600, color:'var(--text-3)' }}>{pct(s.total,total)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Cash flow trend (line) ──
function CashFlowLine({ data }) {
  if (!data?.length) return null
  const W=500, H=90, PAD={top:8,right:8,bottom:24,left:48}
  const innerW=W-PAD.left-PAD.right, innerH=H-PAD.top-PAD.bottom
  const vals = data.map(d=>(d.collected||0)-(d.expenses||0))
  const minV = Math.min(...vals,0), maxV = Math.max(...vals,1)
  const range = maxV-minV||1
  const xPos = i => PAD.left+i*(innerW/(data.length-1||1))
  const yPos = v => PAD.top+innerH*(1-(v-minV)/range)
  const pts  = vals.map((v,i)=>`${xPos(i)},${yPos(v)}`).join(' ')
  const fmtK = v => v>=0?`+₹${v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v}`:`-₹${Math.abs(v)>=1000?(Math.abs(v)/1000).toFixed(0)+'K':Math.abs(v)}`
  const zeroY = yPos(0)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1={PAD.left} y1={zeroY} x2={W-PAD.right} y2={zeroY} stroke="var(--border-2)" strokeWidth="1" strokeDasharray="3 3"/>
      <polyline points={pts} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round"/>
      {vals.map((v,i)=>(
        <g key={i}>
          <circle cx={xPos(i)} cy={yPos(v)} r="3.5" fill={v>=0?'#10B981':'#EF4444'}/>
          <text x={xPos(i)} y={H-PAD.bottom+13} textAnchor="middle" fontSize="9" fill="var(--text-4)" fontFamily="var(--font)">{data[i].label}</text>
        </g>
      ))}
      {[minV,maxV].map((v,i)=>(
        <text key={i} x={PAD.left-4} y={yPos(v)+4} textAnchor="end" fontSize="9" fill="var(--text-4)" fontFamily="var(--mono)">{fmtK(v)}</text>
      ))}
    </svg>
  )
}

// ── Quick action button ──
function QuickAction({ icon, img, label, onClick, color='var(--accent)' }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <button onClick={onClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'14px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s', flex:1, minWidth:80 }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.background='var(--surface-2)';e.currentTarget.style.transform='translateY(-2px)'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--surface)';e.currentTarget.style.transform='none'}}>
      <div style={{ width:44, height:44, borderRadius:'var(--r)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {img && !imgErr
          ? <img src={img} alt={label} onError={()=>setImgErr(true)} style={{ width:44, height:44, objectFit:'contain' }}/>
          : <div style={{ width:44, height:44, borderRadius:'var(--r)', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{icon}</div>
        }
      </div>
      <span style={{ fontSize:11, fontWeight:600, color:'var(--text-2)', textAlign:'center', lineHeight:1.3 }}>{label}</span>
    </button>
  )
}

export default function Dashboard({ org, headers, toast, onNavigate }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('revenue') // revenue | cashflow

  useEffect(() => {
    setLoading(true)
    fetch('/api/dashboard/summary', { headers })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [org.id])

  if (loading) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
      {[1,2,3,4,5,6,7,8].map(i=><div key={i} className="skeleton" style={{ height:96, borderRadius:'var(--r-lg)' }}/>)}
    </div>
  )

  if (!data) return <div style={{ padding:32, color:'var(--text-3)' }}>Failed to load dashboard</div>

  const { fy, invoices, chartData, topCustomers, recentInvoices, recentPayments, upcomingInvoices, expenseByCategory } = data
  const expenseTotal = expenseByCategory?.reduce((s,e)=>s+(e.total||0),0)||0
  const collectionRate = pct(fy?.collected||0, fy?.revenue||1)

  // Days overdue helper
  const daysUntil = d => {
    const diff = new Date(d) - new Date()
    return Math.ceil(diff/(1000*60*60*24))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* ── Quick actions ── */}
      <div>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Quick Actions</div>
        <div style={{ display:'flex', gap:10 }}>
          <QuickAction icon="📄" img="/invoice.png"        label="New Invoice"    onClick={()=>onNavigate('invoices')}        color="#6366F1"/>
          <QuickAction icon="💳" img="/record-payment.png"  label="Record Payment" onClick={()=>onNavigate('payments')}       color="#10B981"/>
          <QuickAction icon="💸" img="/expenses.png"        label="Add Expense"    onClick={()=>onNavigate('expenses')}       color="#EF4444"/>
          <QuickAction icon="📦" img="/purchase-order.png"  label="New PO"         onClick={()=>onNavigate('purchase-orders')} color="#F59E0B"/>
          <QuickAction icon="👤" img="/customers.png"       label="Customers"      onClick={()=>onNavigate('customers')}      color="#14B8A6"/>
          <QuickAction icon="📊" img="/reports.png"         label="Reports"        onClick={()=>onNavigate('reports')}        color="#8B5CF6"/>
        </div>
      </div>

      {/* ── KPI stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <Stat label="FY Revenue"    value={fmt(fy?.revenue||0)}    icon="📈" color="#6366F1" sub={`${collectionRate}% collected`}/>
        <Stat label="Outstanding"   value={fmt(invoices?.outstanding||0)} icon="⏳" color="#F59E0B"
          sub={invoices?.overdue>0?`${invoices.overdue} overdue`:'All current'} onClick={()=>onNavigate('invoices')}/>
        <Stat label="Net Profit"    value={fmt(fy?.netProfit||0)}  icon="💰" color="#10B981"
          sub={`Expenses: ${fmt(expenseTotal)}`}/>
        <Stat label="Cash Balance"  value={fmt(fy?.cashBalance||0)} icon="🏦" color="#3B82F6" sub="From ledger"/>
      </div>

      {/* ── Secondary stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <Stat label="Total Invoices"  value={invoices?.count||0}         icon="📄" color="#6366F1" sub={`${fmt(invoices?.total||0)} total value`}/>
        <Stat label="Collected"       value={fmt(fy?.collected||0)}       icon="✅" color="#10B981" sub={`${collectionRate}% of revenue`}/>
        <Stat label="AR Balance"      value={fmt(fy?.arBalance||0)}       icon="📒" color="#8B5CF6" sub="Accounts receivable"/>
        <Stat label="Total Expenses"  value={fmt(expenseTotal)}           icon="💸" color="#EF4444" sub={`${expenseByCategory?.length||0} categories`} onClick={()=>onNavigate('expenses')}/>
      </div>

      {/* ── Main chart + upcoming ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr', gap:14 }}>
        {/* Chart card */}
        <Card style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Financial Overview</div>
              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Last 6 months · Revenue vs Collected vs Expenses</div>
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {[['revenue','📊'],['cashflow','💹']].map(([t,icon])=>(
                <button key={t} onClick={()=>setTab(t)} style={{ padding:'5px 12px', fontSize:12, fontWeight:600, background:tab===t?'var(--accent-dim)':'var(--surface-2)', color:tab===t?'var(--accent-2)':'var(--text-3)', border:`1px solid ${tab===t?'rgba(99,102,241,0.3)':'var(--border)'}`, borderRadius:'var(--r)', cursor:'pointer', fontFamily:'var(--font)' }}>
                  {icon} {t==='revenue'?'Bars':'Cash Flow'}
                </button>
              ))}
            </div>
          </div>
          {tab === 'revenue' ? <RevenueChart data={chartData}/> : (
            <div>
              <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:10 }}>Net cash flow (Collected − Expenses) per month</div>
              <CashFlowLine data={chartData}/>
            </div>
          )}
        </Card>

        {/* Upcoming / overdue invoices */}
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>⏰ Due Soon</div>
            <button onClick={()=>onNavigate('invoices')} style={{ fontSize:11, color:'var(--accent-2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>View all →</button>
          </div>
          {!upcomingInvoices?.length ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
              <div style={{ fontSize:24, marginBottom:8 }}>🎉</div>
              No invoices due in the next 14 days
            </div>
          ) : (
            <div>
              {upcomingInvoices.map(inv=>{
                const days = daysUntil(inv.dueDate)
                const isOverdue = days < 0
                const balance = (inv.total||0)-(inv.paidAmount||0)
                return (
                  <div key={inv._id} style={{ padding:'11px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.customer?.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', display:'flex', gap:6, marginTop:2 }}>
                        <span style={{ fontFamily:'var(--mono)', color:'var(--accent-2)' }}>{inv.invoiceNumber}</span>
                        <span style={{ color:isOverdue?'var(--red-text)':'var(--amber-text)', fontWeight:600 }}>
                          {isOverdue?`${Math.abs(days)}d overdue`:`Due in ${days}d`}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:isOverdue?'var(--red-text)':'var(--text)' }}>{fmt(balance)}</div>
                      {inv.paidAmount>0 && <div style={{ fontSize:10, color:'var(--text-3)' }}>part paid</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Top customers + Expense donut ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Top customers */}
        <Card style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Top Customers</div>
            <button onClick={()=>onNavigate('customers')} style={{ fontSize:11, color:'var(--accent-2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>View all →</button>
          </div>
          {!topCustomers?.length ? (
            <div style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:16 }}>No customer data yet</div>
          ) : (
            <div>
              {topCustomers.map((c,i)=>{
                const maxVal = topCustomers[0]?.total||1
                return (
                  <div key={c._id} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--accent-2)', flexShrink:0 }}>
                          {String(i+1)}
                        </div>
                        <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{c._id||'Unknown'}</span>
                      </div>
                      <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:'var(--text)', flexShrink:0 }}>{fmt(c.total)}</span>
                    </div>
                    <div style={{ height:4, background:'var(--surface-2)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct(c.total,maxVal)}%`, background:'linear-gradient(90deg,#6366F1,#8B5CF6)', borderRadius:99, transition:'width 0.6s ease' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Expense breakdown */}
        <Card style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Expense Breakdown</div>
            <button onClick={()=>onNavigate('expenses')} style={{ fontSize:11, color:'var(--accent-2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>View all →</button>
          </div>
          <Donut data={expenseByCategory||[]} total={expenseTotal} label="Total"/>
        </Card>
      </div>

      {/* ── Recent invoices + payments ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Recent invoices */}
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>Recent Invoices</div>
            <button onClick={()=>onNavigate('invoices')} style={{ fontSize:11, color:'var(--accent-2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>View all →</button>
          </div>
          {!recentInvoices?.length ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>No invoices yet</div>
          ) : recentInvoices.map(inv=>(
            <div key={inv._id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, transition:'background 0.1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
              onMouseLeave={e=>e.currentTarget.style.background=''}>
              <div style={{ flex:1, overflow:'hidden' }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.customer?.name}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>
                  <span style={{ fontFamily:'var(--mono)', color:'var(--accent-2)' }}>{inv.invoiceNumber}</span>
                  <span style={{ margin:'0 6px' }}>·</span>
                  {fmtDate(inv.issueDate)}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700 }}>{fmt(inv.total)}</div>
                <Badge status={inv.status}/>
              </div>
            </div>
          ))}
        </Card>

        {/* Recent payments */}
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>Recent Payments</div>
            <button onClick={()=>onNavigate('payments')} style={{ fontSize:11, color:'var(--accent-2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>View all →</button>
          </div>
          {!recentPayments?.length ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>No payments yet</div>
          ) : recentPayments.map(p=>(
            <div key={p._id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, transition:'background 0.1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
              onMouseLeave={e=>e.currentTarget.style.background=''}>
              <div style={{ flex:1, overflow:'hidden' }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.party?.name||'—'}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>
                  <span style={{ fontFamily:'var(--mono)', color:'var(--accent-2)' }}>{p.paymentNumber}</span>
                  <span style={{ margin:'0 6px' }}>·</span>
                  {p.paymentMode}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:p.type==='Receipt'?'var(--green-text)':'var(--red-text)' }}>
                  {p.type==='Receipt'?'+':'-'}{fmt(p.amount)}
                </div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>{fmtDate(p.paymentDate)}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

    </div>
  )
}