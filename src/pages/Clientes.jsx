import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function StatusBadge({ status }) {
  const map = {
    ativo: { label: 'Ativo', color: 'var(--red)', bg: 'var(--red-bg)' },
    negociando: { label: 'Negociando', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    quitado: { label: 'Quitado', color: 'var(--green)', bg: 'var(--green-bg)' },
    sem: { label: 'Sem protestos', color: 'var(--text2)', bg: 'var(--bg3)' },
  }
  const s = map[status] || map.ativo
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>{s.label}</span>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clientes')
        .select(`*, protestos(id, valor, quantidade_boletos, status)`)
        .order('criado_em', { ascending: false })
      if (data) setClientes(data)
      setLoading(false)
    }
    load()
  }, [])

  const clientesFiltrados = clientes.filter(c => {
    const matchBusca = busca === '' ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cpf_cnpj.includes(busca)

    const statusesDoCliente = c.protestos?.map(p => p.status) || []
    const matchStatus =
      filtroStatus === 'todos' ||
      statusesDoCliente.includes(filtroStatus)

    return matchBusca && matchStatus
  })

  function totalEmAberto(cliente) {
    return (cliente.protestos || [])
      .filter(p => p.status !== 'quitado')
      .reduce((acc, p) => acc + Number(p.valor), 0)
  }

  function statusPrincipal(cliente) {
    const ps = cliente.protestos || []
    if (ps.some(p => p.status === 'ativo')) return 'ativo'
    if (ps.some(p => p.status === 'negociando')) return 'negociando'
    if (ps.length > 0) return 'quitado'
    return 'sem'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Inadimplentes</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <Link to="/clientes/novo">
          <button style={{
            background: 'var(--accent)', color: '#0f0f0f',
            padding: '9px 18px', borderRadius: 'var(--radius)',
            fontWeight: 600, fontSize: 13,
          }}>+ Novo cliente</button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: 160 }}>
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="negociando">Negociando</option>
          <option value="quitado">Quitado</option>
        </select>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Carregando...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            {busca || filtroStatus !== 'todos' ? 'Nenhum resultado encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Cliente', 'CPF / CNPJ', 'Telefone', 'Protestos', 'Total em aberto', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => (
                <tr key={c.id}
                  onClick={() => navigate(`/clientes/${c.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px', fontWeight: 500 }}>{c.nome}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{c.cpf_cnpj}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text2)' }}>{c.telefone || '—'}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text2)' }}>{c.protestos?.length || 0}</td>
                  <td style={{ padding: '14px 20px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500 }}>{formatBRL(totalEmAberto(c))}</td>
                  <td style={{ padding: '14px 20px' }}><StatusBadge status={statusPrincipal(c)} /></td>
                  <td style={{ padding: '14px 20px', color: 'var(--text3)', fontSize: 16 }}>→</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
