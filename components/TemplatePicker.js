import { useState } from 'react'

export const TEMPLATES = [
  { id: 'classic',      name: 'Classic',      desc: 'Clean blue header, professional layout', color: '#185FA5' },
  { id: 'minimal',      name: 'Minimal',      desc: 'Black & white, ultra clean',             color: '#1a1a1a' },
  { id: 'modern',       name: 'Modern',       desc: 'Teal accent, contemporary feel',         color: '#0F6E56' },
  { id: 'bold',         name: 'Bold',         desc: 'Dark header, high contrast',             color: '#1E2140' },
  { id: 'professional', name: 'Professional', desc: 'Purple accent, premium look',            color: '#6366F1' },
]

function MiniDoc({ color }) {
  return (
    <svg width="80" height="104" viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="104" fill="#ffffff" rx="3"/>
      <rect width="80" height="26" fill={color} rx="3"/>
      <rect x="0" y="20" width="80" height="6" fill={color}/>
      <rect x="6" y="6" width="18" height="8" fill="rgba(255,255,255,0.3)" rx="1"/>
      <rect x="50" y="8" width="24" height="3.5" fill="rgba(255,255,255,0.9)" rx="1"/>
      <rect x="54" y="13" width="18" height="2" fill="rgba(255,255,255,0.5)" rx="1"/>
      <rect x="6" y="31" width="16" height="2" fill="#bbb" rx="1"/>
      <rect x="6" y="35" width="28" height="2.5" fill="#333" rx="1"/>
      <rect x="6" y="39" width="20" height="2" fill="#aaa" rx="1"/>
      <rect x="6" y="47" width="68" height="7" fill={color + "22"} rx="1"/>
      <rect x="8" y="50" width="14" height="1.5" fill={color} rx="1"/>
      <rect x="58" y="50" width="12" height="1.5" fill={color} rx="1"/>
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="6" y={57+i*9} width="68" height="8" fill={i%2===0?"#f9f9f9":"#fff"}/>
          <rect x="8" y={60+i*9} width="22" height="2" fill="#555" rx="1"/>
          <rect x="58" y={60+i*9} width="10" height="2" fill="#333" rx="1"/>
        </g>
      ))}
      <rect x="38" y="84" width="36" height="9" fill={color + "22"} rx="1"/>
      <rect x="40" y="87" width="12" height="2" fill={color} rx="1"/>
      <rect x="58" y="87" width="12" height="2.5" fill={color} rx="1"/>
      <rect x="6" y="98" width="68" height="1" fill="#eee"/>
      <rect x="14" y="101" width="52" height="1.5" fill="#ddd" rx="1"/>
    </svg>
  )
}

export default function TemplatePicker({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
        {TEMPLATES.map(t => {
          const isSelected = value === t.id
          const isHovered  = hovered === t.id
          return (
            <button key={t.id} type="button"
              onClick={() => onChange(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                padding:'8px 8px 6px',
                border: `2px solid ${isSelected ? t.color : isHovered ? t.color+'60' : 'var(--border-2)'}`,
                borderRadius:'var(--r-md)',
                background: isSelected ? t.color+'12' : 'var(--surface-2)',
                cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)',
                boxShadow: isSelected ? `0 0 0 3px ${t.color}25` : 'none',
              }}>
              <div style={{ borderRadius:3, overflow:'hidden', border:`1px solid ${isSelected ? t.color+'50' : 'var(--border)'}`, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
                <MiniDoc color={t.color}/>
              </div>
              <span style={{ fontSize:11, fontWeight: isSelected ? 700 : 500, color: isSelected ? t.color : 'var(--text-2)', whiteSpace:'nowrap' }}>
                {isSelected ? '✓ ' : ''}{t.name}
              </span>
            </button>
          )
        })}
      </div>
      <div style={{ fontSize:12, color:'var(--text-3)', padding:'6px 10px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
        <span style={{ fontWeight:600, color: TEMPLATES.find(t=>t.id===value)?.color }}>
          {TEMPLATES.find(t=>t.id===value)?.name}
        </span>
        {' — '}{TEMPLATES.find(t=>t.id===value)?.desc}
      </div>
    </div>
  )
}
