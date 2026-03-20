import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const QUICK_QUESTIONS = [
  'How do I create an invoice?',
  'How to configure email sending?',
  'What plans are available?',
  'How do partial payments work?',
  'How to add team members?',
  'How to generate GST reports?',
]

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', padding:'10px 14px' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', opacity:0.7, animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isBot = msg.role === 'assistant'
  return (
    <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'flex-start', flexDirection: isBot ? 'row' : 'row-reverse' }}>
      {isBot && (
        <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginTop:2 }}>🤖</div>
      )}
      <div style={{
        maxWidth:'80%', padding:'10px 13px', borderRadius: isBot ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isBot ? 'var(--surface-2)' : 'var(--accent)',
        color: isBot ? 'var(--text)' : '#fff',
        fontSize:13, lineHeight:1.6,
        border: isBot ? '1px solid var(--border)' : 'none',
        whiteSpace:'pre-wrap',
      }}>
        {msg.content}
        <div style={{ fontSize:10, color: isBot ? 'var(--text-4)' : 'rgba(255,255,255,0.6)', marginTop:4, textAlign: isBot ? 'left' : 'right' }}>
          {msg.time}
        </div>
      </div>
    </div>
  )
}

export default function ChatBot({ user, headers }) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([
    { role:'assistant', content:`Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your Synergific Books assistant. I can help you with invoicing, GST reports, payments, account settings and more.\n\nWhat can I help you with today?`, time: now() }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [unread,   setUnread]   = useState(0)
  const bottomRef = useRef()
  const inputRef  = useRef()

  function now() {
    return new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  const send = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')

    const userMsg = { role:'user', content, time: now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const r = await fetch('/api/support/chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role:m.role, content:m.content })),
          userContext: { name:user?.name, plan:user?.plan, orgId:user?.orgId, role:user?.role },
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const botMsg = { role:'assistant', content: d.reply, time: now() }
      setMessages(prev => [...prev, botMsg])
      if (!open) setUnread(u => u + 1)
    } catch(e) {
      setMessages(prev => [...prev, { role:'assistant', content:`Sorry, I couldn't process that. Please try again or contact support at itops@synergificsoftware.com`, time: now() }])
    }
    setLoading(false)
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.85) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pulse2 { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0)} }
      `}</style>

      {/* Chat window */}
      {open && createPortal(
        <div style={{ position:'fixed', bottom:88, right:20, width:360, height:520, background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:18, boxShadow:'0 24px 64px rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', zIndex:99990, animation:'popIn 0.2s ease' }}>

          {/* Header */}
          <div style={{ padding:'14px 16px', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', borderRadius:'18px 18px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'#fff' }}>Synergific Assistant</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7B7', display:'inline-block' }}/>
                  Online · Powered by Claude AI
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', color:'#fff', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column' }}>
            {messages.map((m,i) => <Message key={i} msg={m}/>)}
            {loading && (
              <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🤖</div>
                <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'4px 14px 14px 14px' }}>
                  <TypingDots/>
                </div>
              </div>
            )}

            {/* Quick questions — only show at start */}
            {messages.length === 1 && !loading && (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:11, color:'var(--text-4)', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Quick questions</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {QUICK_QUESTIONS.map(q => (
                    <button key={q} onClick={() => send(q)} style={{ padding:'5px 10px', background:'var(--accent-dim)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:99, fontSize:11, color:'var(--accent-2)', cursor:'pointer', fontFamily:'var(--font)', fontWeight:500, transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='var(--accent-dim)' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', flexShrink:0, display:'flex', gap:8, alignItems:'flex-end' }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask anything about Synergific Books…"
              rows={1} style={{ flex:1, padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:10, fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)', resize:'none', lineHeight:1.5, maxHeight:80, overflowY:'auto' }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--border-2)'}
              onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,80)+'px' }}/>
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width:36, height:36, borderRadius:10, background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface-3)', border:'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s', boxShadow: input.trim() && !loading ? '0 4px 12px rgba(99,102,241,0.4)' : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? '#fff' : 'var(--text-4)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div style={{ padding:'6px 12px 10px', textAlign:'center', fontSize:10, color:'var(--text-4)' }}>
            Powered by Claude AI · <a href="mailto:itops@synergificsoftware.com" style={{ color:'var(--text-4)', textDecoration:'none' }}>itops@synergificsoftware.com</a>
          </div>
        </div>,
        document.body
      )}

      {/* FAB button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ position:'fixed', bottom:20, right:20, width:54, height:54, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, zIndex:99991, boxShadow:'0 8px 24px rgba(99,102,241,0.5)', transition:'all 0.2s', animation: unread > 0 ? 'pulse2 1.5s infinite' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
        {open ? '✕' : '💬'}
        {unread > 0 && !open && (
          <div style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#EF4444', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg)' }}>
            {unread}
          </div>
        )}
      </button>
    </>
  )
}