import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function StatusBadge({ status }) {
  const map = {
    ativo: { label: 'Ativo', color: 'var(--red)', bg: 'var(--red-bg)' },
    negociando: { label: 'Negociando', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    quitado: { label: 'Quitado', color: 'var(--green)', bg: 'var(--green-bg)' },
  }
  const s = map[status] || map.ativo
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 500,
    }}>{s.label}</span>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, clientes: 0, boletos: 0, negociando: 0 })
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: protestos } = await supabase
        .from('protestos')
        .select('*, clientes(nome, cpf_cnpj)')
        .order('criado_em', { ascending: false })

      if (protestos) {
        const ativos = protestos.filter(p => p.status !== 'quitado')
        const clientesUnicos = new Set(ativos.map(p => p.cliente_id)).size
        const totalValor = ativos.reduce((acc, p) => acc + Number(p.valor), 0)
        const totalBoletos = ativos.reduce((acc, p) => acc + Number(p.quantidade_boletos), 0)
        const negociando = protestos.filter(p => p.status === 'negociando').length

        setStats({ total: totalValor, clientes: clientesUnicos, boletos: totalBoletos, negociando })
        setRecentes(protestos.slice(0, 5))
      }
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total em aberto', value: formatBRL(stats.total), accent: true },
    { label: 'Clientes inadimplentes', value: stats.clientes },
    { label: 'Boletos protestados', value: stats.boletos },
    { label: 'Em negociação', value: stats.negociando },
  ]

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Visão geral dos protestos em aberto</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 36 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            background: c.accent ? 'rgba(232,213,163,0.07)' : 'var(--bg2)',
            border: `1px solid ${c.accent ? 'rgba(232,213,163,0.2)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '20px 22px',
            minWidth: 0,
          }}>
            <div style={{ fontSize: 11, color: c.accent ? 'var(--accent2)' : 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.label}</div>
            <div style={{
              fontSize: c.accent ? 20 : 24,
              fontWeight: 600,
              color: c.accent ? 'var(--accent)' : 'var(--text)',
              fontFamily: c.accent ? 'var(--mono)' : 'var(--font)',
              wordBreak: 'break-word',
              lineHeight: 1.15,
            }}>{loading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>Protestos recentes</span>
          <Link to="/clientes" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Ver todos →</Link>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Carregando...</div>
        ) : recentes.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Nenhum protesto cadastrado ainda.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Cliente', 'CPF/CNPJ', 'Valor', 'Boletos', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentes.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '13px 24px', fontWeight: 500 }}>
                    <Link to={`/clientes/${p.cliente_id}`} style={{ color: 'var(--text)', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text)'}>
                      {p.clientes?.nome || '—'}
                    </Link>
                  </td>
                  <td style={{ padding: '13px 24px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{p.clientes?.cpf_cnpj || '—'}</td>
                  <td style={{ padding: '13px 24px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500 }}>{formatBRL(p.valor)}</td>
                  <td style={{ padding: '13px 24px', color: 'var(--text2)' }}>{p.quantidade_boletos}</td>
                  <td style={{ padding: '13px 24px' }}><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
