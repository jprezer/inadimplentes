import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBRL, totalEmAberto } from '../lib/format'
import { Button, StatusBadge, SituacaoBadge, FilterChips, Loading, EmptyState, SearchInput, Icon } from '../components/ui'

function piorStatus(dividas) {
  if (dividas.some(d => d.status === 'aberto')) return 'aberto'
  if (dividas.some(d => d.status === 'negociando')) return 'negociando'
  if (dividas.some(d => d.status === 'quitado')) return 'quitado'
  return null
}

export default function Devedores() {
  const [devedores, setDevedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [params, setParams] = useSearchParams()
  const situacao = params.get('situacao') || 'todos'
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('devedores')
        .select('*, dividas(id, valor, data_vencimento, situacao, status, juros_mensal)')
        .order('criado_em', { ascending: false })
      if (data) setDevedores(data)
      setLoading(false)
    }
    load()
  }, [])

  function temSituacao(d, s) {
    return (d.dividas || []).some(x => x.situacao === s)
  }

  const countTodos = devedores.length
  const countAtraso = devedores.filter(d => temSituacao(d, 'em_atraso')).length
  const countProtestado = devedores.filter(d => temSituacao(d, 'protestado')).length

  const filtrados = devedores.filter(d => {
    const matchBusca = busca === '' ||
      d.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (d.cpf_cnpj || '').includes(busca)
    const matchSit = situacao === 'todos' || temSituacao(d, situacao)
    return matchBusca && matchSit
  })

  const totalGeral = filtrados.reduce((acc, d) => acc + totalEmAberto(d.dividas || []), 0)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Devedores</h1>
          <p className="page-sub">{devedores.length} devedor(es) · {formatBRL(totalGeral)} em aberto</p>
        </div>
        <Link to="/devedores/novo"><Button variant="primary" icon="plus">Novo devedor</Button></Link>
      </div>

      <div className="toolbar">
        <SearchInput value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CPF/CNPJ..." />
        <FilterChips
          value={situacao}
          onChange={v => setParams(v === 'todos' ? {} : { situacao: v }, { replace: true })}
          options={[
            { value: 'todos', label: 'Todos', count: countTodos },
            { value: 'em_atraso', label: 'Em atraso', count: countAtraso },
            { value: 'protestado', label: 'Protestados', count: countProtestado },
          ]}
        />
      </div>

      <div className="card">
        {loading ? (
          <Loading />
        ) : filtrados.length === 0 ? (
          <EmptyState icon="users" title={busca || situacao !== 'todos' ? 'Nenhum resultado' : 'Nenhum devedor ainda'}>
            {busca || situacao !== 'todos' ? 'Ajuste a busca ou o filtro.' : 'Cadastre o primeiro devedor.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Devedor</th><th>CPF / CNPJ</th><th className="num">Dívidas</th>
                  <th className="num">Em aberto</th><th>Situação</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(d => {
                  const dividas = d.dividas || []
                  const emAberto = dividas.filter(x => x.status !== 'quitado')
                  const sits = [...new Set(dividas.map(x => x.situacao))]
                  const status = piorStatus(dividas)
                  return (
                    <tr key={d.id} className="clickable" onClick={() => navigate(`/devedores/${d.id}`)}>
                      <td>
                        <div className="cell-strong">{d.nome}</div>
                        {d.telefone && <div className="dim" style={{ fontSize: 11.5 }}>{d.telefone}</div>}
                      </td>
                      <td className="num cell-muted" style={{ fontSize: 12.5 }}>{d.cpf_cnpj || '—'}</td>
                      <td className="num cell-muted">
                        {dividas.length}
                        {emAberto.length > 0 && <span className="dim" style={{ fontSize: 11 }}> · {emAberto.length} aberta(s)</span>}
                      </td>
                      <td className="num cell-strong">{formatBRL(totalEmAberto(dividas))}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {sits.length ? sits.map(s => <SituacaoBadge key={s} situacao={s} />) : <span className="dim">—</span>}
                        </div>
                      </td>
                      <td>{status ? <StatusBadge status={status} /> : <span className="dim">—</span>}</td>
                      <td><Icon name="chevronRight" size={16} className="row-chevron" /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
