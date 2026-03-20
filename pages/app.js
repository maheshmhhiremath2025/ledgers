import React, { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import AuthPage from '../components/AuthPage'
import InvoiceList from '../components/InvoiceList'
import InvoiceForm from '../components/InvoiceForm'
import POList from '../components/POList'
import POForm from '../components/POForm'
import PaymentList from '../components/PaymentList'
import PaymentForm from '../components/PaymentForm'
import AccountsList from '../components/AccountsList'
import Dashboard from '../components/Dashboard'
import ConfigPage from '../components/ConfigPage'
import BillingPage from '../components/BillingPage'
import RecurringList from '../components/RecurringList'
import ReportsPage from '../components/ReportsPage'
import TeamPage from '../components/TeamPage'
import CustomerPage from '../components/CustomerPage'
import VendorPage from '../components/VendorPage'
import ExpensePage from '../components/ExpensePage'
import ProductCatalogue from '../components/ProductCatalogue'
import CreditNotes from '../components/CreditNotes'
import GlobalSearch from '../components/GlobalSearch'
import SupportPage from '../components/SupportPage'
import ChatBot from '../components/ChatBot'

const NAV = [
  { id:'dashboard',       label:'Dashboard',       path:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10' },
  { id:'invoices',        label:'Invoices',         path:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 18H8M16 14H8M10 10H8' },
  { id:'customers',       label:'Customers',        path:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  { id:'purchase-orders', label:'Purchase Orders',  path:'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3.8 6h16.4M16 10a4 4 0 01-8 0' },
  { id:'vendors',         label:'Vendors',          path:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { id:'payments',        label:'Payments',         path:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id:'expenses',        label:'Expenses',         path:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { id:'products',        label:'Products',         path:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10' },
  { id:'credit-notes',    label:'Credit Notes',     path:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { id:'recurring',       label:'Recurring',        path:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { id:'ledgers',         label:'Ledgers',          path:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id:'reports',         label:'Reports',          path:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id:'config',          label:'Configuration',    path:'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
  { id:'team',            label:'Team',             path:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id:'billing',         label:'Billing',          path:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
]

// Helper: always send token in header + cookie credentials
function authFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : null
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
}

export default function Home() {
  const [user, setUser]         = useState(null)
  const [authLoading, setAL]    = useState(true)
  const [page, setPage]         = useState('dashboard')
  const [view, setView]         = useState('list')
  const [editItem, setEditItem] = useState(null)
  const [toasts, setToasts]     = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUMO]  = useState(false)
  const [theme, setTheme]       = useState('dark')
  const [orgConfig, setOrgConfig] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [orgs, setOrgs] = useState([])
  const [showNewOrg, setShowNewOrg] = useState(false)
  const [switchingOrg, setSwitchingOrg] = useState(null)
  const userMenuRef = useRef()

  // Global search keyboard shortcut
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // Load orgs list
  useEffect(() => {
    if (!user) return
    fetch('/api/orgs', { headers })
      .then(r => r.json())
      .then(d => setOrgs(d.orgs || []))
      .catch(() => {})
  }, [user?.orgId])

  // Refetch org config whenever user leaves config page (logo may have changed)
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('sb_token')
    const h = {
      'x-org-id': user.orgId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    fetch('/api/config', { headers: h, credentials: 'include' })
      .then(r => r.json())
      .then(cfg => { if (!cfg.error) setOrgConfig(cfg) })
      .catch(() => {})
  }, [page, user?.orgId])

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem('sb_theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('sb_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  useEffect(() => {
    const token = localStorage.getItem('sb_token')
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
    fetch('/api/auth/me', { credentials: 'include', headers })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user)
          // Fetch org config for logo
          const h = { 'x-org-id': d.user.orgId, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          fetch('/api/config', { headers: h })
            .then(r => r.json())
            .then(cfg => setOrgConfig(cfg))
            .catch(() => {})
        }
        setAL(false)
      })
      .catch(() => setAL(false))
  }, [])

  useEffect(() => {
    const h = e => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUMO(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const handleOrgSwitch = (newUser) => {
    if (newUser.token) localStorage.setItem('sb_token', newUser.token)
    setUser(newUser)
    setOrgConfig(null)
    setPage('dashboard')
    setView('list')
  }

  const logout = async () => {
    await fetch('/api/auth/me', { method: 'POST', credentials: 'include' })
    localStorage.removeItem('sb_token')
    window.location.href = '/'
  }

  const navigate = p => { setPage(p); setView('list'); setEditItem(null) }
  const openForm = (item = null) => {
    if (user?.role === 'viewer') { return } // viewers cannot edit
    setEditItem(item); setView('form')
  }
  const closeForm = () => { setView('list'); setEditItem(null) }

  const headers = {
    'Content-Type': 'application/json',
    'x-org-id': user?.orgId || 'default',
    ...(typeof window !== 'undefined' && localStorage.getItem('sb_token')
      ? { 'Authorization': `Bearer ${localStorage.getItem('sb_token')}` }
      : {}),
  }

  const orgProp = { id: user?.orgId || 'default', name: user?.orgId || 'default' }
  const curNav  = NAV.find(n => n.id === page)

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 0 32px rgba(99,102,241,0.4)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11h14M11 4v14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading Synergific Books…</div>
      </div>
    </div>
  )

  if (!user) return <AuthPage onAuth={(u, token) => { if (token) localStorage.setItem('sb_token', token); setUser(u) }} />

  return (
    <>
      <Head><title>Synergific Books</title></Head>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* Sidebar */}
        {/* Mobile overlay */}
        <div className={`sb-overlay`} style={{ display: mobileOpen ? 'block' : 'none' }} onClick={() => setMobileOpen(false)} />

        <aside className={`sb-sidebar${mobileOpen ? ' open' : ''}`} style={{ width: collapsed ? 56 : 220, flexShrink: 0, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-2)', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', overflow: 'hidden' }}>

          {/* Brand */}
          <div style={{ height: 56, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-2)', flexShrink: 0, background: 'var(--sidebar-bg)' }}>
            {orgConfig?.logoUrl ? (
              // Logo uploaded — show logo only, no text
              <img
                src={orgConfig.logoUrl}
                alt={orgConfig.businessName || 'Logo'}
                style={{ height: 32, maxWidth: collapsed ? 28 : 148, objectFit: 'contain', borderRadius: 4 }}
              />
            ) : (
              // No logo — show icon + org name
              <>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 14px rgba(99,102,241,0.35)' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                {!collapsed && (
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px' }}>
                    {orgConfig?.businessName || 'Synergific Books'}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '10px 6px', overflowY: 'auto', background: 'var(--sidebar-bg)' }}>
            {!collapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px 8px' }}>Navigation</div>}
            {NAV.map(n => {
              const active = page === n.id
              return (
                <React.Fragment key={n.id}>
                  {n.id === 'config' && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 4px 8px' }} />}
                  <button onClick={() => navigate(n.id)} title={collapsed ? n.label : ''} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: collapsed ? '10px' : '9px 10px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent-2)' : 'var(--text-3)',
                    border: 'none', borderRadius: 'var(--r)',
                    fontWeight: active ? 600 : 400, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.12s', marginBottom: 2,
                    outline: active ? '1px solid rgba(99,102,241,0.2)' : 'none',
                  }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' } }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d={n.path} />
                    </svg>
                    {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{n.label}</span>}
                  </button>
                </React.Fragment>
              )
            })}
          </nav>

          {/* Org Switcher */}
          {/* Support button — just above user avatar */}
          <div style={{ padding: '6px 6px 0' }}>
            <button onClick={() => navigate('support')} title={collapsed ? 'Support' : ''}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding: collapsed ? '10px' : '9px 10px', justifyContent: collapsed ? 'center' : 'flex-start', background: page === 'support' ? 'var(--accent-dim)' : 'transparent', color: page === 'support' ? 'var(--accent-2)' : 'var(--text-3)', border:'none', borderRadius:'var(--r)', fontWeight: page === 'support' ? 600 : 400, fontSize:13, cursor:'pointer', transition:'all 0.12s', outline: page === 'support' ? '1px solid rgba(99,102,241,0.2)' : 'none', fontFamily:'var(--font)' }}
              onMouseEnter={e => { if (page !== 'support') { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' } }}
              onMouseLeave={e => { if (page !== 'support') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' } }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
              {!collapsed && <span style={{ whiteSpace:'nowrap' }}>Support</span>}
            </button>
          </div>

          {/* User */}
          <div style={{ padding: '10px 6px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', background: 'var(--sidebar-bg)' }} ref={userMenuRef}>
            <button onClick={() => setUMO(o => !o)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: collapsed ? '8px' : '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'transparent', border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.orgId}</div>
                </div>
              )}
            </button>

            {userMenuOpen && (
              <div className="fade-up" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 6, right: 6, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', zIndex: 100 }}>
                {/* User info */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{user.email}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: user.plan === 'business' ? 'rgba(99,102,241,0.15)' : user.plan === 'professional' ? 'rgba(59,130,246,0.15)' : 'rgba(136,135,128,0.15)', color: user.plan === 'business' ? '#A5B4FC' : user.plan === 'professional' ? '#93C5FD' : '#9EA3BF' }}>
                      {user.plan === 'business' ? '✦ Business' : user.plan === 'professional' ? '✦ Pro' : 'Free'}
                    </span>
                  </div>
                </div>

                {/* Organisations */}
                <div style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ padding: '7px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Organisations</div>
                  {orgs.map(org => (
                    <button key={org.orgId} onClick={async () => {
                      if (org.isCurrent) return
                      setSwitchingOrg(org.orgId)
                      try {
                        const token = localStorage.getItem('sb_token')
                        const r = await fetch('/api/orgs/switch', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ targetOrgId: org.orgId }),
                        })
                        const d = await r.json()
                        if (d.token) localStorage.setItem('sb_token', d.token)
                        handleOrgSwitch(d.user)
                        setUMO(false)
                      } catch(e) {}
                      setSwitchingOrg(null)
                    }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', background: org.isCurrent ? 'var(--accent-dim)' : 'none', border: 'none', cursor: org.isCurrent ? 'default' : 'pointer', fontFamily: 'var(--font)', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!org.isCurrent) e.currentTarget.style.background = 'var(--surface-3)' }}
                      onMouseLeave={e => { if (!org.isCurrent) e.currentTarget.style.background = 'none' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: org.isCurrent ? 'var(--accent)' : 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: org.isCurrent ? '#fff' : 'var(--text-3)', flexShrink: 0 }}>
                        {(org.businessName || org.orgId).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: org.isCurrent ? 'var(--accent-2)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {org.businessName || org.orgId}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>{org.orgId}</div>
                      </div>
                      {org.isCurrent && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--accent-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {switchingOrg === org.orgId && <div style={{ width: 12, height: 12, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}/>}
                    </button>
                  ))}
                  {/* Add new org */}
                  {user.plan === 'business' && orgs.length < 3 && (
                    <button onClick={() => { setUMO(false); setShowNewOrg(true) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-3)', fontSize: 12 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--accent-2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px dashed var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>+</div>
                      <span style={{ fontWeight: 500 }}>Add organisation <span style={{ fontSize: 10, color: 'var(--text-4)' }}>({orgs.length}/3)</span></span>
                    </button>
                  )}
                  {user.plan !== 'business' && (
                    <div style={{ padding: '7px 14px 9px', fontSize: 11, color: 'var(--text-4)' }}>
                      🔒 Multiple orgs require <span style={{ color: 'var(--amber-text)', fontWeight: 600 }}>Business plan</span>
                    </div>
                  )}
                </div>

                {/* Sign out */}
                <button onClick={logout} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--red-text)', textAlign: 'left', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <div className="sb-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--bg)' }}>

          {/* Topbar */}
          <header style={{ height: 56, borderBottom: '1px solid var(--border-2)', background: 'var(--topbar-bg)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, flexShrink: 0 }}>
            <button onClick={() => { if (window.innerWidth <= 768) setMobileOpen(o => !o); else setCollapsed(c => !c) }} style={{ width: 30, height: 30, border: 'none', background: 'var(--surface)', borderRadius: 'var(--r)', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-3)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{curNav?.label}</span>
              {view === 'form' && <>
                <span style={{ color: 'var(--text-4)', fontSize: 13 }}>/</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{editItem ? 'Edit' : 'New'}</span>
              </>}
            </div>

            {/* Single centered search */}
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              <GlobalSearch headers={headers} onNavigate={navigate} />
            </div>

            {/* Role badge — shown for all roles */}
            {user?.role && (() => {
              const roles = {
                admin:      { label: 'Admin',      color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)', icon: '🛡' },
                accountant: { label: 'Accountant', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', icon: '📊' },
                viewer:     { label: 'View only',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: '👁' },
              }
              const r = roles[user.role] || roles.viewer
              return (
                <div style={{ fontSize: 11, fontWeight: 600, color: r.color, background: r.bg, border: `1px solid ${r.border}`, borderRadius: 'var(--r)', padding: '4px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{r.icon}</span>{r.label}
                </div>
              )
            })()}

            {/* Theme toggle */}
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ width: 32, height: 32, borderRadius: 'var(--r)', background: 'var(--surface)', border: '1px solid var(--border-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-2)'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* FY badge */}
            <div style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '4px 10px', letterSpacing: '0.02em', flexShrink: 0 }}>
              {(() => { const now = new Date(); const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; return `FY ${y}–${String(y + 1).slice(2)}` })()}
            </div>

            {view === 'list' && page !== 'dashboard' && page !== 'ledgers' && page !== 'config' && page !== 'billing' && page !== 'recurring' && page !== 'reports' && page !== 'team' && page !== 'customers' && page !== 'expenses' && page !== 'vendors' && page !== 'products' && page !== 'credit-notes' && page !== 'support' && page !== 'products' && page !== 'credit-notes' && page !== 'support' && page !== 'products' && page !== 'credit-notes' && page !== 'support' && page !== 'products' && page !== 'credit-notes' && page !== 'support' && user?.role !== 'viewer' && (
              <button onClick={() => openForm()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 12px rgba(99,102,241,0.35)', transition: 'all 0.15s', flexShrink: 0, fontFamily: 'var(--font)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.5)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.35)'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New {curNav?.label.replace(/s$/, '')}
              </button>
            )}
          </header>

          {/* Content */}
          <main className="sb-content" style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'var(--bg)' }}>
            <div key={page + view} className="fade-up">
              {page === 'dashboard'       &&                    <Dashboard    org={orgProp} headers={headers} toast={toast} onNavigate={navigate} />}
              {page === 'invoices'        && view === 'list' && <InvoiceList  org={orgProp} headers={headers} toast={toast} onEdit={openForm} readOnly={user?.role === 'viewer'} />}
              {page === 'customers'       &&                    <CustomerPage org={orgProp} headers={headers} toast={toast} readOnly={user?.role === 'viewer'} />}
              {page === 'vendors'         &&                    <VendorPage      org={orgProp} headers={headers} toast={toast} readOnly={user?.role === 'viewer'} />}
              {page === 'products'        &&                    <ProductCatalogue org={orgProp} headers={headers} toast={toast} readOnly={user?.role === 'viewer'} />}
              {page === 'credit-notes'    &&                    <CreditNotes     org={orgProp} headers={headers} toast={toast} readOnly={user?.role === 'viewer'} />}
              {page === 'purchase-orders' && view === 'list' && <POList       org={orgProp} headers={headers} toast={toast} onEdit={openForm} readOnly={user?.role === 'viewer'} />}
              {page === 'payments'        && view === 'list' && <PaymentList  org={orgProp} headers={headers} toast={toast} onEdit={openForm} readOnly={user?.role === 'viewer'} />}
              {page === 'expenses'        &&                    <ExpensePage      org={orgProp} headers={headers} toast={toast} readOnly={user?.role === 'viewer'} />}
              {page === 'recurring'       &&                   <RecurringList org={orgProp} headers={headers} toast={toast} readOnly={user?.role === 'viewer'} />}
              {page === 'ledgers'         &&                    <AccountsList org={orgProp} headers={headers} toast={toast} />}
              {page === 'reports'         &&                    <ReportsPage  org={orgProp} headers={headers} toast={toast} />}
              {page === 'config'          &&                    <ConfigPage      org={orgProp} headers={headers} toast={toast} readOnly={user?.role !== 'admin'} onSave={cfg => setOrgConfig(cfg)} />}
              {page === 'billing'         &&                    <BillingPage  headers={headers} toast={toast} user={user} />}
              {page === 'support'         &&                    <SupportPage  user={user} headers={headers} />}
              {page === 'team'            &&                    <TeamPage     org={orgProp} headers={headers} toast={toast} user={user} onNavigate={navigate} />}
            </div>
          </main>
        </div>
      </div>


      {/* AI Chatbot */}
      {user && <ChatBot user={user} headers={headers} />}

      {/* New org modal */}
      {showNewOrg && (() => {
        const [newOrgId, setNewOrgId] = React.useState('')
        const [bizName, setBizName]   = React.useState('')
        const [creating, setCreating] = React.useState(false)
        const doCreate = async () => {
          if (!newOrgId.trim()) { toast('Organisation ID required', 'error'); return }
          setCreating(true)
          try {
            const token = localStorage.getItem('sb_token')
            const r = await fetch('/api/orgs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
              body: JSON.stringify({ orgId: newOrgId.trim(), businessName: bizName.trim() }),
            })
            const d = await r.json()
            if (!r.ok) { toast(d.error || 'Failed', 'error'); setCreating(false); return }
            toast(`✓ Organisation created!`)
            setShowNewOrg(false)
            // Switch to new org
            const sr = await fetch('/api/orgs/switch', { method:'POST', headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify({targetOrgId:d.orgId}) })
            const sd = await sr.json()
            if (sd.token) localStorage.setItem('sb_token', sd.token)
            handleOrgSwitch(sd.user)
          } catch(e) { toast(e.message,'error') }
          setCreating(false)
        }
        const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:99998, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-xl)', width:'100%', maxWidth:400, boxShadow:'var(--shadow-lg)', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>New Organisation</div>
                <button onClick={()=>setShowNewOrg(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:18, fontFamily:'var(--font)' }}>×</button>
              </div>
              <div style={{ padding:18, display:'flex', flexDirection:'column', gap:12 }}>
                <div><label style={{ display:'block', fontSize:12, color:'var(--text-3)', marginBottom:5 }}>Business Name</label>
                  <input value={bizName} onChange={e=>setBizName(e.target.value)} placeholder="Acme Corp" style={inp} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border-2)'}/></div>
                <div><label style={{ display:'block', fontSize:12, color:'var(--text-3)', marginBottom:5 }}>Organisation ID *</label>
                  <input value={newOrgId} onChange={e=>setNewOrgId(e.target.value)} placeholder="acme-corp" style={inp} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border-2)'}/></div>
                <div style={{ fontSize:11, color:'var(--text-3)', padding:'8px 10px', background:'var(--accent-dim)', borderRadius:'var(--r)', border:'1px solid rgba(99,102,241,0.2)' }}>
                  🔒 Business plan · Max 3 organisations
                </div>
              </div>
              <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8, background:'var(--bg-3)' }}>
                <button onClick={()=>setShowNewOrg(false)} style={{ padding:'8px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, color:'var(--text-2)', fontFamily:'var(--font)' }}>Cancel</button>
                <button onClick={doCreate} disabled={creating} style={{ padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{creating?'Creating…':'+ Create'}</button>
              </div>
            </div>
          </div>
        )
      })()}

      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`} style={{ pointerEvents: 'auto' }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}