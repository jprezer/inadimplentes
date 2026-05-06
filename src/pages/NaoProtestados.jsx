import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TAXA_MENSAL = 0.02

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatData(d) {
  if (!d) return '—'
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}

function mesesEmAtraso(dataVencimento) {
  if (!dataVencimento) return 0
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diffMs = hoje - venc
  if (diffMs <= 0) return 0
  return diffMs / (1000 * 60 * 60 * 24 * 30)
}

function calcularValorAtualizado(valorOriginal, dataVencimento) {
  const meses = mesesEmAtraso(dataVencimento)
  const juros = Number(valorOriginal) * TAXA_MENSAL * meses
  return {
    meses,
    juros,
    total: Number(valorOriginal) + juros,
  }
}

function StatusBadge({ status }) {
  const map = {
    aberto: { label: 'Em aberto', color: 'var(--red)', bg: 'var(--red-bg)' },
    negociando: { label: 'Negociando', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    quitado: { label: 'Quitado', color: 'var(--green)', bg: 'var(--green-bg)' },
  }
  const s = map[status] || map.aberto
  return <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>{s.label}</span>
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text2)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
    </div>
  )
}

const FORM_VAZIO = { nome: '', cpf_cnpj: '', telefone: '', valor_original: '', data_vencimento: '', status: 'aberto', observacoes: '' }

export default function NaoProtestados() {
  const [devedores, setDevedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [modal, setModal] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function load() {
    const { data } = await supabase
      .from('devedores_nao_protestados')
      .select('*')
      .order('data_vencimento', { ascending: true })
    if (data) setDevedores(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function abrirNovo() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErro('')
    setModal(true)
  }

  function abrirEdicao(d) {
    setEditandoId(d.id)
    setForm({
      nome: d.nome || '',
      cpf_cnpj: d.cpf_cnpj || '',
      telefone: d.telefone || '',
      valor_original: String(d.valor_original ?? ''),
      data_vencimento: d.data_vencimento || '',
      status: d.status || 'aberto',
      observacoes: d.observacoes || '',
    })
    setErro('')
    setModal(true)
  }

  async function salvar() {
    setErro('')
    if (!form.nome.trim()) return setErro('Nome é obrigatório.')
    if (!form.valor_original || isNaN(Number(form.valor_original))) return setErro('Valor inválido.')
    if (!form.data_vencimento) return setErro('Data de vencimento é obrigatória.')

    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      cpf_cnpj: form.cpf_cnpj.trim() || null,
      telefone: form.telefone.trim() || null,
      valor_original: Number(form.valor_original),
      data_vencimento: form.data_vencimento,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    }

    let error
    if (editandoId) {
      ({ error } = await supabase.from('devedores_nao_protestados').update(payload).eq('id', editandoId))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      ;({ error } = await supabase.from('devedores_nao_protestados').insert([{ ...payload, user_id: user.id }]))
    }
    setSaving(false)
    if (error) return setErro(error.message)
    setModal(false)
    load()
  }

  async function excluir(d) {
    if (!confirm(`Excluir devedor "${d.nome}"?`)) return
    await supabase.from('devedores_nao_protestados').delete().eq('id', d.id)
    load()
  }

  async function atualizarStatus(id, novoStatus) {
    await supabase.from('devedores_nao_protestados').update({ status: novoStatus }).eq('id', id)
    load()
  }

  const devedoresFiltrados = devedores.filter(d => {
    const matchBusca = busca === '' ||
      d.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (d.cpf_cnpj || '').includes(busca)
    const matchStatus = filtroStatus === 'todos' || d.status === filtroStatus
    return matchBusca && matchStatus
  })

  const totaisAbertos = devedoresFiltrados
    .filter(d => d.status !== 'quitado')
    .reduce((acc, d) => {
      const c = calcularValorAtualizado(d.valor_original, d.data_vencimento)
      acc.original += Number(d.valor_original)
      acc.juros += c.juros
      acc.total += c.total
      return acc
    }, { original: 0, juros: 0, total: 0 })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Devedores não protestados</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            {devedores.length} devedor(es) — juros de 2% ao mês calculados automaticamente a partir do vencimento.
          </p>
        </div>
        <button onClick={abrirNovo} style={{
          background: 'var(--accent)', color: '#0f0f0f',
          padding: '9px 18px', borderRadius: 'var(--radius)',
          fontWeight: 600, fontSize: 13,
        }}>+ Novo devedor</button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Valor original em aberto', value: formatBRL(totaisAbertos.original) },
          { label: 'Juros acumulados (2%/mês)', value: formatBRL(totaisAbertos.juros), accent: true },
          { label: 'Total atualizado em aberto', value: formatBRL(totaisAbertos.total), accent: true },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600, color: c.accent ? 'var(--accent)' : 'var(--text)', wordBreak: 'break-word', lineHeight: 1.15 }}>{c.value}</div>
          </div>
        ))}
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
          <option value="aberto">Em aberto</option>
          <option value="negociando">Negociando</option>
          <option value="quitado">Quitado</option>
        </select>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Carregando...</div>
        ) : devedoresFiltrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            {busca || filtroStatus !== 'todos' ? 'Nenhum resultado encontrado.' : 'Nenhum devedor cadastrado ainda.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Devedor', 'CPF / CNPJ', 'Vencimento', 'Atraso', 'Valor original', 'Juros 2%/mês', 'Total atual', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devedoresFiltrados.map(d => {
                const c = calcularValorAtualizado(d.valor_original, d.data_vencimento)
                const quitado = d.status === 'quitado'
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {d.nome}
                      {d.telefone && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{d.telefone}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>{d.cpf_cnpj || '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{formatData(d.data_vencimento)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: c.meses > 0 ? 'var(--red)' : 'var(--text3)' }}>
                      {c.meses > 0 ? `${c.meses.toFixed(1)} mês(es)` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontWeight: 500 }}>{formatBRL(d.valor_original)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', color: quitado ? 'var(--text3)' : 'var(--yellow)' }}>{formatBRL(quitado ? 0 : c.juros)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontWeight: 600, color: quitado ? 'var(--text3)' : 'var(--accent)' }}>{formatBRL(quitado ? d.valor_original : c.total)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={d.status} onChange={e => atualizarStatus(d.id, e.target.value)}
                        style={{ width: 130, padding: '5px 10px', fontSize: 12 }}>
                        <option value="aberto">Em aberto</option>
                        <option value="negociando">Negociando</option>
                        <option value="quitado">Quitado</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirEdicao(d)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 11, marginRight: 6 }}>Editar</button>
                      <button onClick={() => excluir(d)} style={{ background: 'transparent', border: '1px solid rgba(224,92,92,0.3)', color: 'var(--red)', padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 11 }}>Excluir</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={editandoId ? 'Editar devedor' : 'Novo devedor'} onClose={() => { setModal(false); setErro('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Nome / Razão social *">
                  <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: João da Silva" />
                </Field>
              </div>
              <Field label="CPF / CNPJ"><input value={form.cpf_cnpj} onChange={e => setForm(p => ({ ...p, cpf_cnpj: e.target.value }))} placeholder="000.000.000-00" /></Field>
              <Field label="Telefone"><input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(41) 99999-9999" /></Field>
              <Field label="Valor original (R$) *"><input type="number" value={form.valor_original} onChange={e => setForm(p => ({ ...p, valor_original: e.target.value }))} placeholder="0,00" step="0.01" min="0" /></Field>
              <Field label="Data de vencimento *"><input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Status">
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="aberto">Em aberto</option>
                    <option value="negociando">Negociando</option>
                    <option value="quitado">Quitado</option>
                  </select>
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Observações"><textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} placeholder="Detalhes..." /></Field>
              </div>
            </div>

            {form.valor_original && form.data_vencimento && !isNaN(Number(form.valor_original)) && (() => {
              const c = calcularValorAtualizado(Number(form.valor_original), form.data_vencimento)
              return (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                  Atraso: <strong style={{ color: 'var(--text)' }}>{c.meses.toFixed(2)} mês(es)</strong>
                  {' · '}Juros: <strong style={{ color: 'var(--yellow)' }}>{formatBRL(c.juros)}</strong>
                  {' · '}Total atualizado: <strong style={{ color: 'var(--accent)' }}>{formatBRL(c.total)}</strong>
                </div>
              )
            })()}

            {erro && <div style={{ color: 'var(--red)', fontSize: 12 }}>{erro}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button onClick={() => setModal(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 13 }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} style={{ background: 'var(--accent)', color: '#0f0f0f', padding: '8px 18px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 13 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
