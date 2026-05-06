import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

async function handleLogout() {
  await supabase.auth.signOut()
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem('theme') || 'dark'
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/clientes', label: 'Inadimplentes', icon: '⚠' },
  { to: '/nao-protestados', label: 'Não protestados', icon: '◷' },
]

export default function Layout({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 0',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 10,
      }}>
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>AutoPeças</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            Controle de Protestos
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius)',
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              background: isActive ? 'rgba(232,213,163,0.08)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              fontSize: 13.5,
              transition: 'all 0.15s',
            })}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0 16px', borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 8 }}>v1.0.0 — protótipo</div>
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--text2)', borderRadius: 'var(--radius)',
              padding: '7px 12px', fontSize: 12, textAlign: 'left',
              width: '100%',
            }}
          >
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--text3)', borderRadius: 'var(--radius)',
              padding: '7px 12px', fontSize: 12, textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(224,92,92,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
          >
            Sair
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 220, flex: 1, padding: '36px 40px', maxWidth: 'calc(100vw - 220px)' }}>
        {children}
      </main>
    </div>
  )
}
