import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBRL, formatData, calcDivida, totalEmAberto } from '../lib/format'
import { Button, Field, Modal, StatusSelect, SituacaoBadge, Loading, EmptyState, Icon } from '../components/ui'
import BoletosModal from '../components/BoletosModal.jsx'

const STATUS_OPTS = [
  { value: 'aberto', label: 'Em aberto' },
  { value: 'negociando', label: 'Negociando' },
  { value: 'quitado', label: 'Quitado' },
]

const hoje = () => new Date().toISOString().slice(0, 10)
const FORM_DIVIDA = { descricao: '', valor: '', data_vencimento: '', situacao: 'em_atraso', data_protesto: '', status: 'aberto', juros_pct: '2', observacoes: '' }

export default function DevedorDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [devedor, setDevedor] = useState(null)
  const [dividas, setDividas] = useState([])
  const [contagens, setContagens] = useState({})
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [devedorEdit, setDevedorEdit] = useState({})
  const [modalDivida, setModalDivida] = useState(null)   // 'nova' | divida
  const [boletosDe, setBoletosDe] = useState(null)
  const [protestarDe, setProtestarDe] = useState(null)
  const [dataProtesto, setDataProtesto] = useState(hoje())
  const [form, setForm] = useState(FORM_DIVIDA)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function load() {
    const { data: dev } = await supabase.from('devedores').select('*').eq('id', id).single()
    const { data: ds } = await supabase.from('dividas').select('*').eq('devedor_id', id).order('criado_em', { ascending: false })
    if (dev) { setDevedor(dev); setDevedorEdit(dev) }
    if (ds) {
      setDividas(ds)
      const ids = ds.map(x => x.id)
      if (ids.length) {
        const { data: bs } = await supabase.from('boletos').select('divida_id').in('divida_id', ids)
        const counts = {}
        ;(bs || []).forEach(b => { counts[b.divida_id] = (counts[b.divida_id] || 0) + 1 })
        setContagens(counts)
      } else setContagens({})
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function abrirNovaDivida() {
    setForm(FORM_DIVIDA)
    setErro('')
    setModalDivida('nova')
  }
  function abrirEdicaoDivida(d) {
    setForm({
      descricao: d.descricao || '', valor: String(d.valor), data_vencimento: d.data_vencimento || '',
      situacao: d.situacao, data_protesto: d.data_protesto || '', status: d.status,
      juros_pct: String(Number(d.juros_mensal) * 100), observacoes: d.observacoes || '',
    })
    setErro('')
    setModalDivida(d)
  }

  async function salvarDivida() {
    setErro('')
    if (!form.valor || isNaN(Number(form.valor))) return setErro('Valor inválido.')
    if (!form.data_vencimento) return setErro('Data de vencimento é obrigatória.')
    if (form.situacao === 'protestado' && !form.data_protesto) return setErro('Informe a data do protesto.')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      devedor_id: id,
      descricao: form.descricao.trim() || null,
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento,
      situacao: form.situacao,
      data_protesto: form.situacao === 'protestado' ? form.data_protesto : null,
      status: form.status,
      juros_mensal: Number(form.juros_pct || 0) / 100,
      observacoes: form.observacoes.trim() || null,
    }
    let error
    if (modalDivida === 'nova') {
      ;({ error } = await supabase.from('dividas').insert([{ ...payload, user_id: user.id }]))
    } else {
      ;({ error } = await supabase.from('dividas').update(payload).eq('id', modalDivida.id))
    }
    setSaving(false)
    if (error) return setErro(error.message)
    setModalDivida(null)
    load()
  }

  async function atualizarStatus(dividaId, status) {
    await supabase.from('dividas').update({ status }).eq('id', dividaId)
    load()
  }

  async function confirmarProtesto() {
    if (!dataProtesto) return
    await supabase.from('dividas').update({ situacao: 'protestado', data_protesto: dataProtesto }).eq('id', protestarDe.id)
    setProtestarDe(null)
    load()
  }

  async function excluirDivida(d) {
    if (!confirm('Excluir esta dívida e seus anexos? Essa ação não pode ser desfeita.')) return
    await supabase.from('dividas').delete().eq('id', d.id)
    load()
  }

  async function salvarDevedor() {
    setSaving(true)
    const { id: _i, dividas: _d, criado_em: _c, user_id: _u, ...campos } = devedorEdit
    await supabase.from('devedores').update(campos).eq('id', id)
    setSaving(false)
    setEditando(false)
    load()
  }

  async function excluirDevedor() {
    if (!confirm(`Excluir "${devedor?.nome}" e todas as suas dívidas? Essa ação não pode ser desfeita.`)) return
    await supabase.from('devedores').delete().eq('id', id)
    navigate('/devedores')
  }

  if (loading) return <Loading />
  if (!devedor) return <div className="empty">Devedor não encontrado.</div>

  const totalAberto = totalEmAberto(dividas)

  return (
    <div style={{ maxWidth: 1080 }}>
      <Link to="/devedores" className="back-link"><Icon name="arrowLeft" /> Voltar para devedores</Link>

      {/* Header do devedor */}
      <div className="card card-pad rise" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22 }}>{devedor.nome}</h1>
            <span className="mono muted" style={{ fontSize: 12.5 }}>{devedor.cpf_cnpj || 'sem CPF/CNPJ'}</span>
          </div>
          <div className="row">
            <Button size="sm" icon={editando ? 'x' : 'edit'} onClick={() => setEditando(!editando)}>{editando ? 'Cancelar' : 'Editar'}</Button>
            <Button size="sm" variant="danger" icon="trash" onClick={excluirDevedor}>Excluir</Button>
          </div>
        </div>

        {editando ? (
          <div className="form-grid">
            <Field label="Nome"><input value={devedorEdit.nome || ''} onChange={e => setDevedorEdit(p => ({ ...p, nome: e.target.value }))} /></Field>
            <Field label="CPF/CNPJ"><input value={devedorEdit.cpf_cnpj || ''} onChange={e => setDevedorEdit(p => ({ ...p, cpf_cnpj: e.target.value }))} /></Field>
            <Field label="Telefone"><input value={devedorEdit.telefone || ''} onChange={e => setDevedorEdit(p => ({ ...p, telefone: e.target.value }))} /></Field>
            <Field label="E-mail"><input value={devedorEdit.email || ''} onChange={e => setDevedorEdit(p => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Observações" full><textarea value={devedorEdit.observacoes || ''} onChange={e => setDevedorEdit(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></Field>
            <div className="full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={salvarDevedor} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 18 }}>
            {[
              { label: 'Telefone', value: devedor.telefone || '—' },
              { label: 'E-mail', value: devedor.email || '—' },
              { label: 'Total em aberto', value: formatBRL(totalAberto), accent: true },
            ].map(f => (
              <div key={f.label}>
                <div className="eyebrow" style={{ marginBottom: 5 }}>{f.label}</div>
                <div className={f.accent ? 'mono cell-accent' : ''} style={{ fontSize: f.accent ? 17 : 14 }}>{f.value}</div>
              </div>
            ))}
            {devedor.observacoes && (
              <div style={{ gridColumn: '1/-1' }}>
                <div className="eyebrow" style={{ marginBottom: 5 }}>Observações</div>
                <div className="muted" style={{ fontSize: 13 }}>{devedor.observacoes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dívidas */}
      <div className="card rise" style={{ animationDelay: '0.06s' }}>
        <div className="card-head">
          <h2>Dívidas ({dividas.length})</h2>
          <Button variant="primary" size="sm" icon="plus" onClick={abrirNovaDivida}>Adicionar dívida</Button>
        </div>

        {dividas.length === 0 ? (
          <EmptyState icon="inbox" title="Nenhuma dívida">Adicione a primeira dívida deste devedor.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dividas.map(d => {
              const c = calcDivida(d)
              return (
                <div key={d.id} className="divida-row">
                  <div className="divida-main">
                    <div className="divida-top">
                      <span className="cell-strong">{d.descricao || 'Dívida'}</span>
                      <SituacaoBadge situacao={d.situacao} />
                    </div>
                    <div className="divida-facts mono">
                      <span><span className="dim">Original</span> {formatBRL(d.valor)}</span>
                      <span><span className="dim">Venc.</span> {formatData(d.data_vencimento)}</span>
                      {d.situacao === 'protestado' && <span><span className="dim">Protesto</span> {formatData(d.data_protesto)}</span>}
                      <span style={{ color: c.meses > 0 ? 'var(--danger)' : 'var(--text-3)' }}>{c.meses > 0 ? `${c.meses.toFixed(1)} mês(es)` : 'em dia'}</span>
                      {d.status !== 'quitado' && c.juros > 0 && <span><span className="dim">Juros</span> <span style={{ color: 'var(--info)' }}>{formatBRL(c.juros)}</span></span>}
                      <span><span className="dim">Total</span> <strong style={{ color: 'var(--accent)' }}>{formatBRL(c.total)}</strong></span>
                    </div>
                    {d.observacoes && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{d.observacoes}</div>}
                  </div>
                  <div className="divida-actions">
                    <StatusSelect value={d.status} options={STATUS_OPTS} onChange={e => atualizarStatus(d.id, e.target.value)} />
                    {d.situacao === 'em_atraso' && (
                      <Button size="sm" icon="stamp" onClick={() => { setProtestarDe(d); setDataProtesto(hoje()) }}>Protestar</Button>
                    )}
                    <Button size="sm" icon="paperclip" onClick={() => setBoletosDe(d)}>{contagens[d.id] || 0}</Button>
                    <Button size="sm" icon="edit" onClick={() => abrirEdicaoDivida(d)} />
                    <Button size="sm" variant="danger" icon="trash" onClick={() => excluirDivida(d)} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {boletosDe && <BoletosModal divida={boletosDe} onClose={() => setBoletosDe(null)} onChange={load} />}

      {/* Modal nova/editar dívida */}
      {modalDivida && (
        <Modal title={modalDivida === 'nova' ? 'Nova dívida' : 'Editar dívida'} onClose={() => { setModalDivida(null); setErro('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid">
              <Field label="Descrição (opcional)" full><input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: NF 1234, duplicata..." /></Field>
              <Field label="Valor original (R$) *"><input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" /></Field>
              <Field label="Vencimento *"><input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></Field>
              <Field label="Situação">
                <select value={form.situacao} onChange={e => setForm(p => ({ ...p, situacao: e.target.value, data_protesto: e.target.value === 'protestado' && !p.data_protesto ? hoje() : p.data_protesto }))}>
                  <option value="em_atraso">Em atraso (sem protesto)</option>
                  <option value="protestado">Protestado em cartório</option>
                </select>
              </Field>
              {form.situacao === 'protestado'
                ? <Field label="Data do protesto *"><input type="date" value={form.data_protesto} onChange={e => setForm(p => ({ ...p, data_protesto: e.target.value }))} /></Field>
                : <Field label="Juros ao mês (%)"><input type="number" step="0.1" min="0" value={form.juros_pct} onChange={e => setForm(p => ({ ...p, juros_pct: e.target.value }))} /></Field>}
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="aberto">Em aberto</option>
                  <option value="negociando">Negociando</option>
                  <option value="quitado">Quitado</option>
                </select>
              </Field>
              {form.situacao === 'protestado' && (
                <Field label="Juros ao mês (%)"><input type="number" step="0.1" min="0" value={form.juros_pct} onChange={e => setForm(p => ({ ...p, juros_pct: e.target.value }))} /></Field>
              )}
              <Field label="Observações" full><textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} placeholder="Detalhes..." /></Field>
            </div>

            {form.valor && form.data_vencimento && !isNaN(Number(form.valor)) && (() => {
              const c = calcDivida({ valor: form.valor, data_vencimento: form.data_vencimento, juros_mensal: Number(form.juros_pct || 0) / 100, status: form.status })
              return (
                <div className="alert alert-info">
                  Atraso: <strong style={{ color: 'var(--text)' }}>{c.meses.toFixed(2)} mês(es)</strong>
                  {' · '}Juros: <strong style={{ color: 'var(--info)' }}>{formatBRL(c.juros)}</strong>
                  {' · '}Total: <strong style={{ color: 'var(--accent)' }}>{formatBRL(c.total)}</strong>
                </div>
              )
            })()}

            {erro && <div className="alert alert-danger">{erro}</div>}
            <div className="modal-actions">
              <Button onClick={() => setModalDivida(null)}>Cancelar</Button>
              <Button variant="primary" onClick={salvarDivida} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal protestar */}
      {protestarDe && (
        <Modal title="Registrar protesto" onClose={() => setProtestarDe(null)} width={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="muted" style={{ fontSize: 13 }}>
              A dívida <strong style={{ color: 'var(--text)' }}>{formatBRL(protestarDe.valor)}</strong> passará de <em>em atraso</em> para <em>protestada em cartório</em>.
            </p>
            <Field label="Data do protesto"><input type="date" value={dataProtesto} onChange={e => setDataProtesto(e.target.value)} /></Field>
            <div className="modal-actions">
              <Button onClick={() => setProtestarDe(null)}>Cancelar</Button>
              <Button variant="primary" icon="stamp" onClick={confirmarProtesto}>Protestar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
