import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBRL, calcDivida } from '../lib/format'
import { SituacaoBadge, StatusBadge, Loading, EmptyState, Icon } from '../components/ui'

export default function Dashboard() {
  const [dividas, setDividas] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('dividas')
        .select('*, devedores(id, nome, cpf_cnpj)')
        .order('criado_em', { ascending: false })
      setDividas(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loading />

  const abertas = dividas.filter(d => d.status !== 'quitado')
  const totalGeral = abertas.reduce((a, d) => a + calcDivida(d).total, 0)
  const totalProtestado = abertas.filter(d => d.situacao === 'protestado').reduce((a, d) => a + calcDivida(d).total, 0)
  const totalAtraso = abertas.filter(d => d.situacao === 'em_atraso').reduce((a, d) => a + calcDivida(d).total, 0)
  const negociando = dividas.filter(d => d.status === 'negociando').length
  const devedoresAbertos = new Set(abertas.map(d => d.devedores?.id)).size

  const cards = [
    { label: 'Protestado em aberto', value: formatBRL(totalProtestado), sub: 'em cartório', icon: 'stamp' },
    { label: 'Em atraso (sem protesto)', value: formatBRL(totalAtraso), sub: 'juros incluídos', icon: 'clock' },
    { label: 'Em negociação', value: negociando, sub: 'dívidas', icon: 'inbox' },
  ]

  const recentes = dividas.slice(0, 5)

  // maiores devedores em aberto
  const porDevedor = {}
  abertas.forEach(d => {
    const k = d.devedores?.id
    if (!k) return
    if (!porDevedor[k]) porDevedor[k] = { nome: d.devedores.nome, id: k, total: 0 }
    porDevedor[k].total += calcDivida(d).total
  })
  const maiores = Object.values(porDevedor).sort((a, b) => b.total - a.total).slice(0, 5)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Painel</h1>
          <p className="page-sub">{devedoresAbertos} devedor(es) com pendência · visão geral de tudo em aberto.</p>
        </div>
        <Link to="/consulta"><button className="btn btn-secondary"><Icon name="search" /> Consulta na venda</button></Link>
      </div>

      <div className="dash-hero stagger">
        <div className="stat accent">
          <div className="stat-label"><Icon name="shield" size={14} /> Total geral em aberto</div>
          <div className="stat-value" style={{ fontSize: 30 }}>{formatBRL(totalGeral)}</div>
          <div className="stat-sub">Protestado + em atraso, valores atualizados</div>
        </div>
        {cards.map(c => (
          <div className="stat" key={c.label}>
            <div className="stat-label"><Icon name={c.icon} size={14} /> {c.label}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-cols">
        <div className="card">
          <div className="card-head">
            <h2>Dívidas recentes</h2>
            <Link to="/devedores" className="row" style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>Ver todas <Icon name="arrowRight" size={13} /></Link>
          </div>
          {recentes.length === 0 ? (
            <EmptyState icon="inbox" title="Nenhuma dívida ainda">Cadastre um devedor e sua primeira dívida.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Devedor</th><th className="num">Total atual</th><th>Situação</th><th>Status</th></tr></thead>
                <tbody>
                  {recentes.map(d => {
                    const c = calcDivida(d)
                    return (
                      <tr key={d.id} className="clickable" onClick={() => navigate(`/devedores/${d.devedores?.id}`)}>
                        <td>
                          <div className="cell-strong">{d.devedores?.nome || '—'}</div>
                          <div className="dim mono" style={{ fontSize: 11.5 }}>{d.devedores?.cpf_cnpj || ''}</div>
                        </td>
                        <td className="num cell-strong">{formatBRL(c.total)}</td>
                        <td><SituacaoBadge situacao={d.situacao} /></td>
                        <td><StatusBadge status={d.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Maiores devedores</h2>
            <Link to="/devedores" className="row" style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>Ver todos <Icon name="arrowRight" size={13} /></Link>
          </div>
          {maiores.length === 0 ? (
            <EmptyState icon="users" title="Nenhum em aberto">Os maiores valores em aberto aparecem aqui.</EmptyState>
          ) : (
            <div style={{ padding: '6px 0' }}>
              {maiores.map(m => (
                <Link key={m.id} to={`/devedores/${m.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border)' }}>
                  <span className="cell-strong cell-truncate">{m.nome}</span>
                  <span className="num cell-accent nowrap">{formatBRL(m.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
