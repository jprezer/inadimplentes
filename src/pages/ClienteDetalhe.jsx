import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BoletosModal from '../components/BoletosModal.jsx'

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatData(d) {
  if (!d) return '—'
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}

function StatusBadge({ status }) {
  const map = {
    ativo: { label: 'Ativo', color: 'var(--red)', bg: 'var(--red-bg)' },
    negociando: { label: 'Negociando', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    quitado: { label: 'Quitado', color: 'var(--green)', bg: 'var(--green-bg)' },
  }
  const s = map[status] || map.ativo
  return <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>{s.label}</span>
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 500 }}>
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

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [protestos, setProtestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalProtesto, setModalProtesto] = useState(false)
  const [boletosDoProtesto, setBoletosDoProtesto] = useState(null)
  const [contagensBoletos, setContagensBoletos] = useState({})
  const [editando, setEditando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({ valor: '', quantidade_boletos: '1', data_protesto: '', status: 'ativo', observacoes: '' })
  const [clienteEdit, setClienteEdit] = useState({})

  async function load() {
    const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()
    const { data: p } = await supabase.from('protestos').select('*').eq('cliente_id', id).order('criado_em', { ascending: false })
    if (c) { setCliente(c); setClienteEdit(c) }
    if (p) {
      setProtestos(p)
      const ids = p.map(x => x.id)
      if (ids.length) {
        const { data: bs } = await supabase.from('boletos').select('protesto_id').in('protesto_id', ids)
        const counts = {}
        ;(bs || []).forEach(b => { counts[b.protesto_id] = (counts[b.protesto_id] || 0) + 1 })
        setContagensBoletos(counts)
      } else {
        setContagensBoletos({})
      }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function salvarProtesto() {
    setErro('')
    if (!form.valor || isNaN(Number(form.valor))) return setErro('Valor inválido.')
    if (!form.data_protesto) return setErro('Data obrigatória.')
    setSaving(true)
    const { error } = await supabase.from('protestos').insert([{ ...form, cliente_id: id, valor: Number(form.valor), quantidade_boletos: Number(form.quantidade_boletos) }])
    setSaving(false)
    if (error) return setErro(error.message)
    setModalProtesto(false)
    setForm({ valor: '', quantidade_boletos: '1', data_protesto: '', status: 'ativo', observacoes: '' })
    load()
  }

  async function atualizarStatus(protestoId, novoStatus) {
    await supabase.from('protestos').update({ status: novoStatus }).eq('id', protestoId)
    load()
  }

  async function salvarCliente() {
    setSaving(true)
    await supabase.from('clientes').update(clienteEdit).eq('id', id)
    setSaving(false)
    setEditando(false)
    load()
  }

  async function excluirCliente() {
    if (!confirm(`Excluir "${cliente?.nome}" e todos os seus protestos? Essa ação não pode ser desfeita.`)) return
    await supabase.from('clientes').delete().eq('id', id)
    navigate('/clientes')
  }

  if (loading) return <div style={{ color: 'var(--text3)', padding: 40 }}>Carregando...</div>
  if (!cliente) return <div style={{ color: 'var(--red)', padding: 40 }}>Cliente não encontrado.</div>

  const totalAberto = protestos.filter(p => p.status !== 'quitado').reduce((a, p) => a + Number(p.valor), 0)

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <Link to="/clientes" style={{ fontSize: 12, color: 'var(--text2)' }}>← Voltar</Link>
      </div>

      {/* Header do cliente */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{cliente.nome}</h1>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{cliente.cpf_cnpj}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditando(!editando)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 12 }}>
              {editando ? 'Cancelar' : 'Editar'}
            </button>
            <button onClick={excluirCliente} style={{ background: 'transparent', border: '1px solid rgba(224,92,92,0.3)', color: 'var(--red)', padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 12 }}>
              Excluir
            </button>
          </div>
        </div>

        {editando ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nome"><input value={clienteEdit.nome || ''} onChange={e => setClienteEdit(p => ({ ...p, nome: e.target.value }))} /></Field>
            <Field label="CPF/CNPJ"><input value={clienteEdit.cpf_cnpj || ''} onChange={e => setClienteEdit(p => ({ ...p, cpf_cnpj: e.target.value }))} /></Field>
            <Field label="Telefone"><input value={clienteEdit.telefone || ''} onChange={e => setClienteEdit(p => ({ ...p, telefone: e.target.value }))} /></Field>
            <Field label="E-mail"><input value={clienteEdit.email || ''} onChange={e => setClienteEdit(p => ({ ...p, email: e.target.value }))} /></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Observações"><textarea value={clienteEdit.observacoes || ''} onChange={e => setClienteEdit(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></Field>
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={salvarCliente} disabled={saving} style={{ background: 'var(--accent)', color: '#0f0f0f', padding: '8px 18px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 13 }}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Telefone', value: cliente.telefone || '—' },
              { label: 'E-mail', value: cliente.email || '—' },
              { label: 'Total em aberto', value: formatBRL(totalAberto), mono: true },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontFamily: f.mono ? 'var(--mono)' : 'var(--font)', fontWeight: f.mono ? 600 : 400, color: f.mono ? 'var(--accent)' : 'var(--text)' }}>{f.value}</div>
              </div>
            ))}
            {cliente.observacoes && (
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Observações</div>
                <div style={{ color: 'var(--text2)', fontSize: 13 }}>{cliente.observacoes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Protestos */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>Protestos ({protestos.length})</span>
          <button onClick={() => setModalProtesto(true)} style={{ background: 'var(--accent)', color: '#0f0f0f', padding: '7px 14px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 12 }}>
            + Adicionar protesto
          </button>
        </div>

        {protestos.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Nenhum protesto cadastrado.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Data', 'Valor', 'Boletos', 'Status', 'Observações', 'Ação', 'Anexos'].map(h => (
                  <th key={h} style={{ padding: '9px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {protestos.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{formatData(p.data_protesto)}</td>
                  <td style={{ padding: '12px 20px', fontFamily: 'var(--mono)', fontWeight: 500 }}>{formatBRL(p.valor)}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--text2)' }}>{p.quantidade_boletos}</td>
                  <td style={{ padding: '12px 20px' }}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: '12px 20px', color: 'var(--text2)', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.observacoes || '—'}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <select value={p.status} onChange={e => atualizarStatus(p.id, e.target.value)}
                      style={{ width: 130, padding: '5px 10px', fontSize: 12 }}>
                      <option value="ativo">Ativo</option>
                      <option value="negociando">Negociando</option>
                      <option value="quitado">Quitado</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <button onClick={() => setBoletosDoProtesto(p)}
                      style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '5px 10px', borderRadius: 'var(--radius)', fontSize: 11 }}>
                      Boletos ({contagensBoletos[p.id] || 0})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {boletosDoProtesto && (
        <BoletosModal
          protesto={boletosDoProtesto}
          onClose={() => setBoletosDoProtesto(null)}
          onChange={load}
        />
      )}

      {/* Modal novo protesto */}
      {modalProtesto && (
        <Modal title="Novo protesto" onClose={() => { setModalProtesto(false); setErro('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Valor (R$) *"><input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" step="0.01" /></Field>
              <Field label="Qtd. boletos"><input type="number" value={form.quantidade_boletos} onChange={e => setForm(p => ({ ...p, quantidade_boletos: e.target.value }))} min="1" /></Field>
              <Field label="Data *"><input type="date" value={form.data_protesto} onChange={e => setForm(p => ({ ...p, data_protesto: e.target.value }))} /></Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="ativo">Ativo</option>
                  <option value="negociando">Negociando</option>
                  <option value="quitado">Quitado</option>
                </select>
              </Field>
            </div>
            <Field label="Observações"><textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} placeholder="Detalhes..." /></Field>
            {erro && <div style={{ color: 'var(--red)', fontSize: 12 }}>{erro}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button onClick={() => setModalProtesto(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 13 }}>Cancelar</button>
              <button onClick={salvarProtesto} disabled={saving} style={{ background: 'var(--accent)', color: '#0f0f0f', padding: '8px 18px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 13 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
