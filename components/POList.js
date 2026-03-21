import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Btn, SearchBar, Card, EmptyState, fmt, fmtDate } from './ui'

function PDFDropdown({ poId, poNumber, orgId, anchorEl, onClose, onOpen }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef()

  useEffect(() => {
    if (!anchorEl) return
    const r = anchorEl.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, left: r.right + window.scrollX - 210 })
  }, [anchorEl])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target) && !anchorEl?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [anchorEl])

  const openPDF = async (mode) => {
    onClose()
    const params = new URLSearchParams({ orgId })

    if (mode === 'print') {
      params.set('print', '1')
      window.open(`/api/purchase-orders/${poId}/pdf?${params}`, '_blank')
      onOpen('Opening print dialog…', 'info')
    } else if (mode === 'download') {
      try {
        onOpen('Generating PDF…', 'info')
        const res = await fetch(`/api/purchase-orders/${poId}/pdf?${params}`)
        if (!res.ok) throw new Error('Failed to fetch PO')
        const html = await res.text()

        await new Promise((resolve, reject) => {
          if (window.html2pdf) return resolve()
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })

        const container = document.createElement('div')
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;'
        container.innerHTML = html
        // Fix dark backgrounds for Bold template
        const page = container.querySelector('.page')
        if (page) {
          page.style.background = '#ffffff'
          page.style.color = '#1a1a1a'
          page.querySelectorAll('.pbox,.bank-box,.note-box,.tot-wrap').forEach(el => {
            const bg = window.getComputedStyle ? window.getComputedStyle(el).backgroundColor : ''
            if (bg && (bg.includes('30,') || bg.includes('14,') || bg.includes('13,'))) {
              el.style.background = '#f5f5f5'
              el.style.color = '#1a1a1a'
            }
          })
        }
        document.body.appendChild(container)

        await window.html2pdf().set({
          margin: 0,
          filename: `${poNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(container.querySelector('.page') || container).save()

        document.body.removeChild(container)
        onOpen('PDF downloaded!', 'success')
      } catch(e) {
        console.error(e)
        onOpen('Download failed', 'error')
      }
    } else {
      window.open(`/api/purchase-orders/${poId}/pdf?${params}`, '_blank')
      onOpen('PDF opened in new tab', 'info')
    }
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <div ref={ref} style={{
      position: 'absolute', top: pos.top, left: pos.left,
      background: '#1E2140', border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: 10, zIndex: 99998, minWidth: 210, overflow: 'hidden',
      boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
    }}>
      <div style={{ padding: '7px 12px', fontSize: 10, fontWeight: 700, color: '#636880', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {poNumber}
      </div>
      {[
        { mode: 'view',     icon: '👁', label: 'View PDF',      sub: 'Opens in new tab' },
        { mode: 'download', icon: '⬇️', label: 'Download PDF',  sub: 'Direct PDF download' },
        { mode: 'print',    icon: '🖨', label: 'Print',         sub: 'Opens print dialog' },
      ].map(({ mode, icon, label, sub }) => (
        <button key={mode} onClick={() => openPDF(mode)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#9EA3BF', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = '#252848'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 500, color: '#ECEEF8', fontSize: 12 }}>{label}</div>
            <div style={{ fontSize: 10, color: '#636880', marginTop: 1 }}>{sub}</div>
          </div>
        </button>
      ))}
    </div>,
    document.body
  )
}

export default function POList({ org, headers, toast, onEdit, readOnly = false }) {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [sf, setSF]           = useState('')
  const [pdfMenu, setPdfMenu] = useState(null)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (sf) p.set('status', sf)
    fetch(`/api/purchase-orders?${p}`, { headers })
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [org.id, search, sf])

  const markStatus = async (e, po, status) => {
    e.stopPropagation()
    await fetch(`/api/purchase-orders/${po._id}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    toast(`Marked as ${status}`)
    load()
  }

  const del = async (e, po) => {
    e.stopPropagation()
    if (!confirm(`Delete ${po.poNumber}?`)) return
    await fetch(`/api/purchase-orders/${po._id}`, { method: 'DELETE', headers })
    toast('PO deleted')
    load()
  }

  const STATUS_PILLS = [
    { label: 'Draft',    color: 'var(--text-3)' },
    { label: 'Sent',     color: 'var(--teal-text)' },
    { label: 'Paid', color: 'var(--green-text)' },
    { label: 'Partial',  color: 'var(--amber-text)' },
  ]

  return (
    <div>
      {pdfMenu && (
        <PDFDropdown
          poId={pdfMenu.id} poNumber={pdfMenu.number} orgId={org.id}
          anchorEl={pdfMenu.el} onClose={() => setPdfMenu(null)}
          onOpen={(msg, type) => toast(msg, type)}
        />
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {STATUS_PILLS.map(({ label, color }) => {
          const items = orders.filter(o => o.status === label)
          const active = sf === label
          return (
            <button key={label} onClick={() => setSF(active ? '' : label)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', minWidth: 130,
              background: active ? 'var(--surface-2)' : 'var(--surface)',
              border: `1px solid ${active ? 'var(--border-3)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color }}>{items.length}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                {fmt(items.reduce((s, o) => s + (o.total || 0), 0))}
              </div>
            </button>
          )
        })}
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search purchase orders…" />
          <select value={sf} onChange={e => setSF(e.target.value)}
            style={{ padding: '7px 11px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)' }}>
            <option value="">All status</option>
            {['Draft','Sent','Paid','Partial','Cancelled'].map(s => (
              <option key={s} value={s} style={{ background: 'var(--bg-2)' }}>{s}</option>
            ))}
          </select>
          <Btn size="sm" onClick={load}>↻</Btn>
        </div>

        {loading
          ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
          : orders.length === 0
            ? <EmptyState message="No purchase orders yet." />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['PO #', 'Vendor', 'Date', 'Expected', 'Status', 'Total', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Total' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: 'var(--bg-3)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(po => (
                    <tr key={po._id} onClick={() => onEdit(po)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--teal-text)', fontSize: 12 }}>{po.poNumber}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{po.vendor?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{po.vendor?.email || ''}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: 12 }}>{fmtDate(po.issueDate)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>{fmtDate(po.expectedDate)}</td>
                      <td style={{ padding: '12px 14px' }}><Badge status={po.status==='Sent'?'Draft':po.status} /></td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)' }}>{fmt(po.total)}</td>
                      <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                        {readOnly ? (
                          <Btn size="sm" onClick={e => { e.stopPropagation(); setPdfMenu({ id: po._id, number: po.poNumber, el: e.currentTarget }) }}>PDF ▾</Btn>
                        ) : (
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {po.status === 'Draft' && <Btn size="sm" onClick={e => markStatus(e, po, 'Sent')}>Send</Btn>}
                            {po.status === 'Sent'  && <Btn size="sm" variant="primary" onClick={e => markStatus(e, po, 'Paid')}>Paid</Btn>}
                            <Btn size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                if (pdfMenu?.id === po._id) { setPdfMenu(null); return }
                                setPdfMenu({ id: po._id, number: po.poNumber, el: e.currentTarget })
                              }}>
                              PDF ▾
                            </Btn>
                            <Btn size="sm" onClick={e => { e.stopPropagation(); onEdit(po) }}>Edit</Btn>
                            <Btn size="sm" variant="danger" onClick={e => del(e, po)}>✕</Btn>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{orders.length} orders</span><span>{org.name}</span>
        </div>
      </Card>
    </div>
  )
}