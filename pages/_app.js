import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  // Apply saved theme on first load
  useEffect(() => {
    const saved = localStorage.getItem('sb_theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return <Component {...pageProps} />
}