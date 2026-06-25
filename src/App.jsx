import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Devedores from './pages/Devedores.jsx'
import DevedorDetalhe from './pages/DevedorDetalhe.jsx'
import NovoDevedor from './pages/NovoDevedor.jsx'
import Consulta from './pages/Consulta.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/devedores" element={<Devedores />} />
        <Route path="/devedores/novo" element={<NovoDevedor />} />
        <Route path="/devedores/:id" element={<DevedorDetalhe />} />
        <Route path="/consulta" element={<Consulta />} />

        {/* compatibilidade com rotas antigas */}
        <Route path="/clientes" element={<Navigate to="/devedores" replace />} />
        <Route path="/clientes/novo" element={<Navigate to="/devedores/novo" replace />} />
        <Route path="/clientes/:id" element={<RedirectCliente />} />
        <Route path="/nao-protestados" element={<Navigate to="/devedores?situacao=em_atraso" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

// /clientes/:id -> /devedores/:id (mesmo id preservado na migração)
import { useParams } from 'react-router-dom'
function RedirectCliente() {
  const { id } = useParams()
  return <Navigate to={`/devedores/${id}`} replace />
}
