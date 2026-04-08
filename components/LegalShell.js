import Head from 'next/head'
import Link from 'next/link'

export default function LegalShell({ title, lastUpdated, children }) {
  return (
    <>
      <Head><title>{title} · HexaLabs Books</title></Head>
      <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font)' }}>
        <header style={{ borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
          <div style={{ maxWidth:880, margin:'0 auto', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
              <img src="/favicon.svg" alt="" width={28} height={28}/>
              <span style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>HexaLabs Books</span>
            </Link>
            <nav style={{ display:'flex', gap:18, fontSize:13 }}>
              <Link href="/terms"   style={{ color:'var(--text-3)', textDecoration:'none' }}>Terms</Link>
              <Link href="/privacy" style={{ color:'var(--text-3)', textDecoration:'none' }}>Privacy</Link>
              <Link href="/refund"  style={{ color:'var(--text-3)', textDecoration:'none' }}>Refund</Link>
              <Link href="/app"     style={{ color:'var(--accent-2)', textDecoration:'none', fontWeight:600 }}>Sign in</Link>
            </nav>
          </div>
        </header>
        <main style={{ maxWidth:780, margin:'0 auto', padding:'40px 24px 80px' }}>
          <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.5px', marginBottom:8 }}>{title}</h1>
          <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:32 }}>Last updated: {lastUpdated}</div>
          <div style={{ fontSize:15, lineHeight:1.75, color:'var(--text-2)' }}>
            {children}
          </div>
        </main>
        <footer style={{ borderTop:'1px solid var(--border)', padding:'24px', textAlign:'center', fontSize:12, color:'var(--text-4)' }}>
          © {new Date().getFullYear()} HexaLabs. All rights reserved.
        </footer>
      </div>
    </>
  )
}

export const H2 = ({ children }) => <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', marginTop:32, marginBottom:12 }}>{children}</h2>
export const P  = ({ children }) => <p style={{ marginBottom:14 }}>{children}</p>
export const UL = ({ children }) => <ul style={{ marginBottom:14, paddingLeft:22 }}>{children}</ul>
export const LI = ({ children }) => <li style={{ marginBottom:6 }}>{children}</li>
