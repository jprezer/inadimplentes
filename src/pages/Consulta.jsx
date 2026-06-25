import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBRL, totalEmAberto } from '../lib/format'
import { SituacaoBadge, Loading, Icon } from '../components/ui'

const norm = s => (s || '').toLowerCase().replace(/[.\-/\s]/g, '')

export default function Consulta() {
  const [devedores, setDevedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('devedores')
        .select('*, dividas(id, valor, data_vencimento, situacao, status, juros_mensal)')
      if (data) setDevedores(data)
      setLoading(false)
    }
    load()
  }, [])

  const termo = norm(q)
  const matches = termo.length < 2 ? [] : devedores.filter(d =>
    norm(d.cpf_cnpj).includes(termo) || norm(d.nome).includes(termo)
  )

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Consulta na venda</h1>
          <p className="page-sub">Verifique se o cliente tem dívida em aberto antes de fechar o pedido.</p>
        </div>
      </div>

      <div className="search" style={{ maxWidth: '100%', marginBottom: 22 }}>
        <Icon name="search" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Digite o CPF / CNPJ ou nome do cliente..."
          autoFocus
          style={{ fontSize: 16, padding: '14px 14px 14px 42px' }}
        />
      </div>

      {loading ? (
        <Loading />
      ) : termo.length < 2 ? (
        <div className="empty"><Icon name="search" /><div className="empty-title">Comece a digitar</div><div style={{ fontSize: 13 }}>A consulta mostra a situação do cliente em tempo real.</div></div>
      ) : matches.length === 0 ? (
        <div className="verdict verdict-clear rise">
          <div className="verdict-icon"><Icon name="check" /></div>
          <div>
            <div className="verdict-title">Sem registro</div>
            <div className="muted" style={{ fontSize: 13 }}>Nenhum devedor encontrado com “{q}”. Não há dívida cadastrada — pode prosseguir.</div>
          </div>
        </div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.map(d => {
            const dividas = d.dividas || []
            const aberto = totalEmAberto(dividas)
            const temDivida = aberto > 0
            const sits = [...new Set(dividas.filter(x => x.status !== 'quitado').map(x => x.situacao))]
            return (
              <Link key={d.id} to={`/devedores/${d.id}`} className={`verdict ${temDivida ? 'verdict-debt' : 'verdict-clear'}`}>
                <div className="verdict-icon"><Icon name={temDivida ? 'alert' : 'check'} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="verdict-title">{temDivida ? 'Dívida em aberto' : 'Sem pendências'}</div>
                  <div className="cell-strong" style={{ marginTop: 2 }}>{d.nome}</div>
                  <div className="mono muted" style={{ fontSize: 12 }}>{d.cpf_cnpj || 'sem CPF/CNPJ'}</div>
                  {temDivida && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {sits.map(s => <SituacaoBadge key={s} situacao={s} />)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="eyebrow">Em aberto</div>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 500, color: temDivida ? 'var(--danger)' : 'var(--success)' }}>{formatBRL(aberto)}</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
