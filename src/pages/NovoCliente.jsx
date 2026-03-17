import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
    </div>
  )
}

export default function NovoCliente() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const [cliente, setCliente] = useState({
    nome: '', cpf_cnpj: '', telefone: '', email: '', observacoes: ''
  })

  const [protesto, setProtesto] = useState({
    valor: '', quantidade_boletos: '1', data_protesto: '', status: 'ativo', observacoes: ''
  })

  function setC(field) {
    return e => setCliente(prev => ({ ...prev, [field]: e.target.value }))
  }

  function setP(field) {
    return e => setProtesto(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit() {
    setErro('')
    if (!cliente.nome.trim()) return setErro('Nome do cliente é obrigatório.')
    if (!cliente.cpf_cnpj.trim()) return setErro('CPF/CNPJ é obrigatório.')
    if (!protesto.valor || isNaN(Number(protesto.valor))) return setErro('Valor do protesto inválido.')
    if (!protesto.data_protesto) return setErro('Data do protesto é obrigatória.')

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: novoCliente, error: errCliente } = await supabase
      .from('clientes')
      .insert([{ ...cliente, user_id: user.id }])
      .select()
      .single()

    if (errCliente) {
      setSaving(false)
      return setErro(errCliente.message.includes('unique') ? 'Já existe um cliente com esse CPF/CNPJ.' : errCliente.message)
    }

    const { error: errProtesto } = await supabase
      .from('protestos')
      .insert([{ ...protesto, cliente_id: novoCliente.id, valor: Number(protesto.valor), quantidade_boletos: Number(protesto.quantidade_boletos) }])

    setSaving(false)
    if (errProtesto) return setErro(errProtesto.message)
    navigate(`/clientes/${novoCliente.id}`)
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <Link to="/clientes" style={{ fontSize: 12, color: 'var(--text2)' }}>← Voltar</Link>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 10, marginBottom: 4 }}>Novo cliente</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Preencha os dados do cliente e o primeiro protesto.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Dados do cliente */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Dados do cliente</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Nome completo / Razão social *">
              <input value={cliente.nome} onChange={setC('nome')} placeholder="Ex: João da Silva" />
            </Field>
            <Field label="CPF / CNPJ *">
              <input value={cliente.cpf_cnpj} onChange={setC('cpf_cnpj')} placeholder="000.000.000-00" />
            </Field>
            <Field label="Telefone">
              <input value={cliente.telefone} onChange={setC('telefone')} placeholder="(41) 99999-9999" />
            </Field>
            <Field label="E-mail">
              <input value={cliente.email} onChange={setC('email')} placeholder="cliente@email.com" />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Observações">
                <textarea value={cliente.observacoes} onChange={setC('observacoes')} rows={2} placeholder="Anotações gerais sobre o cliente..." />
              </Field>
            </div>
          </div>
        </div>

        {/* Primeiro protesto */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Protesto</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Valor (R$) *">
              <input type="number" value={protesto.valor} onChange={setP('valor')} placeholder="0,00" step="0.01" min="0" />
            </Field>
            <Field label="Quantidade de boletos *">
              <input type="number" value={protesto.quantidade_boletos} onChange={setP('quantidade_boletos')} min="1" />
            </Field>
            <Field label="Data do protesto *">
              <input type="date" value={protesto.data_protesto} onChange={setP('data_protesto')} />
            </Field>
            <Field label="Status">
              <select value={protesto.status} onChange={setP('status')}>
                <option value="ativo">Ativo</option>
                <option value="negociando">Negociando</option>
                <option value="quitado">Quitado</option>
              </select>
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Observações">
                <textarea value={protesto.observacoes} onChange={setP('observacoes')} rows={2} placeholder="Detalhes sobre o protesto..." />
              </Field>
            </div>
          </div>
        </div>

        {erro && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', color: 'var(--red)', fontSize: 13 }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Link to="/clientes">
            <button style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '9px 18px', borderRadius: 'var(--radius)', fontSize: 13 }}>
              Cancelar
            </button>
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ background: 'var(--accent)', color: '#0f0f0f', padding: '9px 22px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 13, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}
