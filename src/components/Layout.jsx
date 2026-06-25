import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from './ui'

async function handleLogout() {
  await supabase.auth.signOut()
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem('theme') || 'dark'
}

const navItems = [
  { to: '/', label: 'Painel', icon: 'dashboard', exact: true },
  { to: '/devedores', label: 'Devedores', icon: 'users', group: 'Cobranças' },
  { to: '/consulta', label: 'Consulta', icon: 'search', sub: 'na venda' },
]

export default function Layout({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="shield" /></div>
          <div>
            <div className="brand-name">Controle de<br />Protestos</div>
            <div className="brand-tag">AutoPeças</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map(item => (
            <div key={item.to} style={{ display: 'contents' }}>
              {item.group && <div className="nav-label">{item.group}</div>}
              <NavLink
                to={item.to}
                end={item.exact}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                <Icon name={item.icon} />
                {item.label}
                {item.sub && <span className="nav-sub">{item.sub}</span>}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="foot-meta">
            <span>v1.0.0</span>
            <span>protótipo</span>
          </div>
          <button className="icon-btn" onClick={toggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button className="icon-btn danger" onClick={handleLogout}>
            <Icon name="logout" />
            Sair
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  )
}
