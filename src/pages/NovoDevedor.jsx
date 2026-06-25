import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBRL, calcDivida } from '../lib/format'
import { Button, Field, Icon } from '../components/ui'

const hoje = () => new Date().toISOString().slice(0, 10)

export default function NovoDevedor() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [comDivida, setComDivida] = useState(true)
  const [dev, setDev] = useState({ nome: '', cpf_cnpj: '', telefone: '', email: '', observacoes: '' })
  const [div, setDiv] = useState({ descricao: '', valor: '', data_vencimento: '', situacao: 'em_atraso', data_protesto: '', status: 'aberto', juros_pct: '2' })

  const setD = f => e => setDev(p => ({ ...p, [f]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!dev.nome.trim()) return setErro('Nome do devedor é obrigatório.')
    if (comDivida) {
      if (!div.valor || isNaN(Number(div.valor))) return setErro('Valor da dívida inválido.')
      if (!div.data_vencimento) return setErro('Vencimento da dívida é obrigatório.')
      if (div.situacao === 'protestado' && !div.data_protesto) return setErro('Informe a data do protesto.')
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: novoDev, error } = await supabase
      .from('devedores')
      .insert([{ ...dev, cpf_cnpj: dev.cpf_cnpj.trim() || null, user_id: user.id }])
      .select()
      .single()
    if (error) { setSaving(false); return setErro(error.message) }

    if (comDivida) {
      const { error: e2 } = await supabase.from('dividas').insert([{
        devedor_id: novoDev.id, user_id: user.id,
        descricao: div.descricao.trim() || null,
        valor: Number(div.valor),
        data_vencimento: div.data_vencimento,
        situacao: div.situacao,
        data_protesto: div.situacao === 'protestado' ? div.data_protesto : null,
        status: div.status,
        juros_mensal: Number(div.juros_pct || 0) / 100,
      }])
      if (e2) { setSaving(false); return setErro('Devedor criado, mas falhou ao salvar a dívida: ' + e2.message) }
    }
    setSaving(false)
    navigate(`/devedores/${novoDev.id}`)
  }

  const previa = comDivida && div.valor && div.data_vencimento && !isNaN(Number(div.valor))
    ? calcDivida({ valor: div.valor, data_vencimento: div.data_vencimento, juros_mensal: Number(div.juros_pct || 0) / 100, status: div.status })
    : null

  return (
    <div style={{ maxWidth: 660 }}>
      <Link to="/devedores" className="back-link"><Icon name="arrowLeft" /> Voltar para devedores</Link>
      <div className="page-head" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="page-title">Novo devedor</h1>
          <p className="page-sub">Cadastre o devedor e, se quiser, já registre a primeira dívida.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card card-pad rise">
          <div className="eyebrow" style={{ color: 'var(--accent-2)', marginBottom: 18 }}>Dados do devedor</div>
          <div className="form-grid">
            <Field label="Nome / Razão social *"><input value={dev.nome} onChange={setD('nome')} placeholder="Ex: João da Silva" autoFocus /></Field>
            <Field label="CPF / CNPJ"><input value={dev.cpf_cnpj} onChange={setD('cpf_cnpj')} placeholder="000.000.000-00" /></Field>
            <Field label="Telefone"><input value={dev.telefone} onChange={setD('telefone')} placeholder="(41) 99999-9999" /></Field>
            <Field label="E-mail"><input value={dev.email} onChange={setD('email')} placeholder="cliente@email.com" /></Field>
            <Field label="Observações" full><textarea value={dev.observacoes} onChange={setD('observacoes')} rows={2} placeholder="Anotações gerais..." /></Field>
          </div>
        </div>

        <div className="card card-pad rise" style={{ animationDelay: '0.06s' }}>
          <label className="row" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={comDivida} onChange={e => setComDivida(e.target.checked)} style={{ width: 16, height: 16, flex: 'none' }} />
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>Registrar a primeira dívida agora</span>
          </label>

          {comDivida && (
            <div className="form-grid" style={{ marginTop: 18 }}>
              <Field label="Descrição (opcional)" full><input value={div.descricao} onChange={e => setDiv(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: NF 1234, duplicata..." /></Field>
              <Field label="Valor original (R$) *"><input type="number" step="0.01" min="0" value={div.valor} onChange={e => setDiv(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" /></Field>
              <Field label="Vencimento *"><input type="date" value={div.data_vencimento} onChange={e => setDiv(p => ({ ...p, data_vencimento: e.target.value }))} /></Field>
              <Field label="Situação">
                <select value={div.situacao} onChange={e => setDiv(p => ({ ...p, situacao: e.target.value, data_protesto: e.target.value === 'protestado' && !p.data_protesto ? hoje() : p.data_protesto }))}>
                  <option value="em_atraso">Em atraso (sem protesto)</option>
                  <option value="protestado">Protestado em cartório</option>
                </select>
              </Field>
              {div.situacao === 'protestado'
                ? <Field label="Data do protesto *"><input type="date" value={div.data_protesto} onChange={e => setDiv(p => ({ ...p, data_protesto: e.target.value }))} /></Field>
                : <Field label="Juros ao mês (%)"><input type="number" step="0.1" min="0" value={div.juros_pct} onChange={e => setDiv(p => ({ ...p, juros_pct: e.target.value }))} /></Field>}
              <Field label="Status">
                <select value={div.status} onChange={e => setDiv(p => ({ ...p, status: e.target.value }))}>
                  <option value="aberto">Em aberto</option>
                  <option value="negociando">Negociando</option>
                  <option value="quitado">Quitado</option>
                </select>
              </Field>
              {previa && (
                <div className="alert alert-info full">
                  Atraso: <strong style={{ color: 'var(--text)' }}>{previa.meses.toFixed(2)} mês(es)</strong>
                  {' · '}Juros: <strong style={{ color: 'var(--info)' }}>{formatBRL(previa.juros)}</strong>
                  {' · '}Total: <strong style={{ color: 'var(--accent)' }}>{formatBRL(previa.total)}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Link to="/devedores"><Button type="button">Cancelar</Button></Link>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar devedor'}</Button>
        </div>
      </form>
    </div>
  )
}
