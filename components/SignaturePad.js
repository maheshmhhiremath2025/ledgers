import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Btn } from './ui'

const FONTS = [
  { id:'cursive',   label:'Cursive',   style:"font-family:'Dancing Script',cursive;font-size:32px" },
  { id:'formal',    label:'Formal',    style:"font-family:'Pinyon Script',cursive;font-size:30px" },
  { id:'simple',    label:'Simple',    style:"font-family:'Caveat',cursive;font-size:28px" },
]

function DrawPad({ onSave, onCancel, color='#1a1a2e' }) {
  const canvasRef = useRef()
  const [drawing, setDrawing] = useState(false)
  const [isEmpty, setIsEmpty]  = useState(true)
  const lastPos = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    // Set canvas internal size to match its display size
    const rect = canvas.getBoundingClientRect()
    if (rect.width > 0) {
      canvas.width = rect.width
      canvas.height = rect.height
    } else {
      canvas.width = 480
      canvas.height = 160
    }
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY }
  }

  const start = e => {
    e.preventDefault()
    setDrawing(true)
    setIsEmpty(false)
    const pos = getPos(e, canvasRef.current)
    lastPos.current = pos
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  const move = e => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  const end = () => setDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const save = () => {
    if (isEmpty) { alert('Please draw your signature first'); return }
    const canvas = canvasRef.current
    console.log('[draw] canvas size:', canvas.width, 'x', canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    console.log('[draw] dataUrl len:', dataUrl.length)
    const sizeKb = Math.round(dataUrl.length * 0.75 / 1024)
    if (sizeKb > 50) {
      alert(`Signature is ${sizeKb}KB. Please keep it under 50KB.`)
      return
    }
    onSave(dataUrl)
  }

  return (
    <div>
      <div style={{ position:'relative', borderRadius:'var(--r)', overflow:'hidden', border:'2px dashed var(--border-2)', background:'#fff', cursor:'crosshair' }}>
        <canvas ref={canvasRef} width={480} height={160}
          style={{ display:'block', width:'100%', touchAction:'none' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
        {isEmpty && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <span style={{ fontSize:14, color:'#bbb', fontStyle:'italic' }}>Draw your signature here</span>
          </div>
        )}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
        <button onClick={clear} style={{ fontSize:12, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)' }}>↺ Clear</button>
        <div style={{ display:'flex', gap:8 }}>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={isEmpty}>✓ Use Signature</Btn>
        </div>
      </div>
    </div>
  )
}

function TypePad({ onSave, onCancel }) {
  const [text, setText] = useState('')
  const [font, setFont] = useState('cursive')
  const canvasRef = useRef()

  const save = () => {
    if (!text.trim()) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const f = FONTS.find(f => f.id === font)
    const fontFamily = font === 'cursive' ? "'Dancing Script', cursive" : font === 'formal' ? "'Pinyon Script', cursive" : "'Caveat', cursive"
    ctx.font = `${font === 'formal' ? 30 : 32}px ${fontFamily}`
    ctx.fillStyle = '#1a1a2e'
    ctx.textBaseline = 'middle'
    const metrics = ctx.measureText(text)
    const x = Math.max(20, (canvas.width - metrics.width) / 2)
    ctx.fillText(text, x, canvas.height / 2)
    const dataUrl = canvas.toDataURL('image/png')
    const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024)
    if (sizeKb > 50) { alert(`Image is ${sizeKb}KB, over 50KB limit.`); return }
    onSave(dataUrl)
  }

  return (
    <div>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pinyon+Script&family=Caveat:wght@600&display=swap" rel="stylesheet"/>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Type your name"
        style={{ width:'100%', padding:'10px 14px', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', background:'var(--surface-2)', outline:'none', fontFamily:'var(--font)', marginBottom:12 }}
        onFocus={e => e.target.style.borderColor='var(--accent)'}
        onBlur={e => e.target.style.borderColor='var(--border-2)'}/>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {FONTS.map(f => (
          <button key={f.id} onClick={() => setFont(f.id)} style={{
            flex:1, padding:'10px 6px', border:`2px solid ${font===f.id?'var(--accent)':'var(--border-2)'}`,
            borderRadius:'var(--r)', background: font===f.id?'var(--accent-dim)':'var(--surface-2)',
            cursor:'pointer', fontFamily:'var(--font)', fontSize:11, color: font===f.id?'var(--accent-2)':'var(--text-3)', fontWeight:600,
          }}>{f.label}</button>
        ))}
      </div>
      {/* Preview */}
      <div style={{ background:'#fff', border:'2px dashed var(--border-2)', borderRadius:'var(--r)', height:80, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12, overflow:'hidden' }}>
        {text ? (
          <span style={{
            fontFamily: font==='cursive' ? "'Dancing Script', cursive" : font==='formal' ? "'Pinyon Script', cursive" : "'Caveat', cursive",
            fontSize: font==='formal' ? 30 : 32, color:'#1a1a2e', padding:'0 16px',
          }}>{text}</span>
        ) : (
          <span style={{ fontSize:13, color:'#bbb', fontStyle:'italic' }}>Preview appears here</span>
        )}
      </div>
      <canvas ref={canvasRef} width={480} height={80} style={{ display:'none' }}/>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={!text.trim()}>✓ Use Signature</Btn>
      </div>
    </div>
  )
}

function UploadPad({ onSave, onCancel }) {
  const [preview, setPreview] = useState(null)

  const handle = e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 50 * 1024) {
      alert(`File is ${Math.round(file.size/1024)}KB. Please upload an image under 50KB.

Tip: Use a PNG with transparent background and compress it at tinypng.com`)
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <label style={{ display:'block', border:'2px dashed var(--border-2)', borderRadius:'var(--r)', padding:'24px', textAlign:'center', cursor:'pointer', background:'var(--surface-2)', marginBottom:12 }}
        onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-2)'}>
        <input type="file" accept="image/*" onChange={handle} style={{ display:'none' }}/>
        {preview ? (
          <img src={preview} alt="Signature" style={{ maxHeight:100, maxWidth:'100%', objectFit:'contain' }}/>
        ) : (
          <div>
            <div style={{ fontSize:28, marginBottom:8 }}>🖊️</div>
            <div style={{ fontSize:13, color:'var(--text-2)', fontWeight:600 }}>Click to upload signature image</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>PNG with transparent background works best</div>
          </div>
        )}
      </label>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={() => {
          console.log('[upload] preview len:', preview?.length)
          if (preview) onSave(preview)
          else alert('Please select an image first')
        }} disabled={!preview}>✓ Use Signature</Btn>
      </div>
    </div>
  )
}

export default function SignaturePad({ value, onChange, signerName, signerTitle }) {
  const [open,    setOpen]    = useState(false)
  const [tab,     setTab]     = useState('draw')

  const handleSave = (dataUrl) => {
    onChange(dataUrl)
    setOpen(false)
  }

  const clear = () => onChange('')

  const tabStyle = (t) => ({
    padding:'8px 16px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
    borderBottom: tab===t ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab===t ? 'var(--accent-2)' : 'var(--text-3)',
    background:'none', fontFamily:'var(--font)', transition:'all 0.15s',
  })

  return (
    <>
      {/* Trigger area */}
      <div style={{ border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
        {value ? (
          <div style={{ position:'relative', background:'#fff', padding:'12px 16px', minHeight:80, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={value} alt="Signature" style={{ maxHeight:70, maxWidth:280, objectFit:'contain' }}/>
            <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:6 }}>
              <button onClick={() => setOpen(true)} style={{ padding:'4px 10px', fontSize:11, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', cursor:'pointer', color:'var(--text-2)', fontFamily:'var(--font)' }}>Change</button>
              <button onClick={clear} style={{ padding:'4px 10px', fontSize:11, background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--r-sm)', cursor:'pointer', color:'var(--red-text)', fontFamily:'var(--font)' }}>Remove</button>
            </div>
            {(signerName || signerTitle) && (
              <div style={{ position:'absolute', bottom:6, left:16, fontSize:11, color:'#888' }}>
                {signerName && <div style={{ fontWeight:600 }}>{signerName}</div>}
                {signerTitle && <div>{signerTitle}</div>}
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setOpen(true)} style={{ width:'100%', padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:8, background:'var(--surface-2)', border:'none', cursor:'pointer', fontFamily:'var(--font)' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--surface-2)'}>
            <span style={{ fontSize:24 }}>✍️</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text-2)' }}>Add Signature</span>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>Draw, type or upload — appears on invoice PDF</span>
          </button>
        )}
      </div>

      {/* Modal */}
      {open && createPortal(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="fade-up" style={{ background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-xl)', width:'100%', maxWidth:560, boxShadow:'var(--shadow-lg)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Add Your Signature</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Appears on all invoice PDFs from this organisation</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface-3)', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', padding:'0 20px' }}>
              <button style={tabStyle('draw')} onClick={() => setTab('draw')}>✏️ Draw</button>
              <button style={tabStyle('type')} onClick={() => setTab('type')}>Aa Type</button>
              <button style={tabStyle('upload')} onClick={() => setTab('upload')}>⬆ Upload</button>
            </div>

            {/* Content */}
            <div style={{ padding:20 }}>
              {tab === 'draw'   && <DrawPad  onSave={handleSave} onCancel={() => setOpen(false)}/>}
              {tab === 'type'   && <TypePad  onSave={handleSave} onCancel={() => setOpen(false)}/>}
              {tab === 'upload' && <UploadPad onSave={handleSave} onCancel={() => setOpen(false)}/>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}