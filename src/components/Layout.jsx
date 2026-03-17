import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/clientes', label: 'Inadimplentes', icon: '⚠' },
]

export default function Layout({ children }) {
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

        <div style={{ padding: '0 24px', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>v1.0.0 — protótipo</div>
        </div>
      </aside>

      <main style={{ marginLeft: 220, flex: 1, padding: '36px 40px', maxWidth: 'calc(100vw - 220px)' }}>
        {children}
      </main>
    </div>
  )
}
