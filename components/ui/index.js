export const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const fmt2 = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const today = () => new Date().toISOString().split('T')[0]

export const STATUS_META = {
  Draft:     { color: 'var(--amber-text)', bg: 'var(--amber-dim)',  dot: 'var(--amber)' },
  Due:       { color: 'var(--amber-text)', bg: 'var(--amber-dim)',  dot: 'var(--amber)' },
  Sent:      { color: 'var(--blue-text)', bg: 'var(--blue-dim)',   dot: 'var(--blue)' },
  Paid:      { color: 'var(--green-text)',bg: 'var(--green-dim)',  dot: 'var(--green)' },
  Overdue:   { color: 'var(--red-text)',  bg: 'var(--red-dim)',    dot: 'var(--red)' },
  Cancelled: { color: 'var(--text-3)',    bg: 'var(--surface-3)',  dot: '#636880' },
  Received:  { color: 'var(--green-text)',bg: 'var(--green-dim)',  dot: 'var(--green)' },
  Partial:   { color: 'var(--amber-text)',bg: 'var(--amber-dim)',  dot: 'var(--amber)' },
  Posted:    { color: 'var(--green-text)',bg: 'var(--green-dim)',  dot: 'var(--green)' },
  Cleared:   { color: 'var(--green-text)',bg: 'var(--green-dim)',  dot: 'var(--green)' },
  Pending:   { color: 'var(--amber-text)',bg: 'var(--amber-dim)',  dot: 'var(--amber)' },
  Bounced:   { color: 'var(--red-text)',  bg: 'var(--red-dim)',    dot: 'var(--red)' },
  Receipt:   { color: 'var(--green-text)',bg: 'var(--green-dim)',  dot: 'var(--green)' },
  Payment:   { color: 'var(--amber-text)',bg: 'var(--amber-dim)',  dot: 'var(--amber)' },
}

export function Badge({ status }) {
  const m = STATUS_META[status] || { color: 'var(--text-2)', bg: 'var(--surface-3)', dot: 'var(--text-3)' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

export function Btn({ children, onClick, variant = 'default', size = 'md', disabled, style = {}, type = 'button' }) {
  const base = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 'var(--r)', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'var(--font)', opacity: disabled ? 0.45 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }
  const variants = {
    default: { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)' },
    primary: { background: 'var(--accent)',    color: '#fff',          border: 'none', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' },
    danger:  { background: 'var(--red-dim)',   color: 'var(--red-text)', border: '1px solid rgba(239,68,68,0.25)' },
    ghost:   { background: 'transparent',      color: 'var(--text-3)', border: 'none' },
    outline: { background: 'transparent',      color: 'var(--text-2)', border: '1px solid var(--border-3)' },
  }
  const sizes = {
    sm: { padding: '4px 10px', fontSize: 12 },
    md: { padding: '7px 14px', fontSize: 13 },
    lg: { padding: '10px 20px', fontSize: 14 },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...sizes[size], ...style }}>
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder, required, style = {}, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}</label>}
      <input
        type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        style={{ padding: '8px 11px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'var(--font)' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</div>}
    </div>
  )
}

export function Select({ label, value, onChange, options, required, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}</label>}
      <select
        value={value || ''} onChange={e => onChange(e.target.value)} required={required}
        style={{ padding: '8px 11px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
      >
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o} style={{ background: 'var(--bg-2)' }}>{o}</option>
          : <option key={o.value} value={o.value} style={{ background: 'var(--bg-2)' }}>{o.label}</option>
        )}
      </select>
    </div>
  )
}

export function Card({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', ...style }}>
      {children}
    </div>
  )
}

export function EmptyState({ message, action, actionLabel }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-3)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>{message}</div>
      {action && <Btn variant="primary" onClick={action} style={{ marginTop: 8 }}>{actionLabel}</Btn>}
    </div>
  )
}

export function Table({ columns, data, onRowClick }) {
  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '10px 14px', textAlign: col.align || 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: 'var(--bg-3)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row._id || i}
              onClick={() => onRowClick && onRowClick(row)}
              style={{ borderBottom: '1px solid var(--border)', cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.1s', position: 'relative' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '12px 14px', textAlign: col.align || 'left', verticalAlign: 'middle' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 11px 7px 32px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-2)'}
      />
    </div>
  )
}

export function SectionTitle({ children, style = {} }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, ...style }}>
      {children}
    </div>
  )
}

export function Divider() {
  return <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
}