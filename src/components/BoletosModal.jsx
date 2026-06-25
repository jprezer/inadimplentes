import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatBRL, formatData } from '../lib/format'
import { Button, Field, Modal, Loading, EmptyState } from './ui'

const BUCKET = 'boletos'
const FORM_VAZIO = { vencimento: '', codigo_barras: '', valor: '', arquivo: null }

export default function BoletosModal({ divida, onClose, onChange }) {
  const [boletos, setBoletos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function load() {
    const { data } = await supabase
      .from('boletos')
      .select('*')
      .eq('divida_id', divida.id)
      .order('vencimento', { ascending: true, nullsFirst: false })
    if (data) setBoletos(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [divida.id])

  async function salvar() {
    setErro('')
    if (!form.vencimento && !form.codigo_barras && !form.arquivo) {
      return setErro('Informe ao menos vencimento, código de barras ou arquivo.')
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    let arquivo_path = null
    let arquivo_nome = null
    if (form.arquivo) {
      const ext = form.arquivo.name.split('.').pop()
      arquivo_nome = form.arquivo.name
      arquivo_path = `${user.id}/${divida.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(arquivo_path, form.arquivo)
      if (upErr) {
        setSaving(false)
        return setErro('Falha no upload: ' + upErr.message)
      }
    }

    const payload = {
      divida_id: divida.id,
      user_id: user.id,
      vencimento: form.vencimento || null,
      codigo_barras: form.codigo_barras.trim() || null,
      valor: form.valor ? Number(form.valor) : null,
      arquivo_path,
      arquivo_nome,
    }
    const { error } = await supabase.from('boletos').insert([payload])
    setSaving(false)
    if (error) {
      if (arquivo_path) await supabase.storage.from(BUCKET).remove([arquivo_path])
      return setErro(error.message)
    }
    setForm(FORM_VAZIO)
    const input = document.getElementById('boleto-arquivo-input')
    if (input) input.value = ''
    load()
    onChange?.()
  }

  async function excluir(b) {
    if (!confirm('Excluir este boleto?')) return
    if (b.arquivo_path) await supabase.storage.from(BUCKET).remove([b.arquivo_path])
    await supabase.from('boletos').delete().eq('id', b.id)
    load()
    onChange?.()
  }

  async function abrirArquivo(b) {
    if (!b.arquivo_path) return
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(b.arquivo_path, 60)
    if (error) return alert('Erro ao abrir arquivo: ' + error.message)
    window.open(data.signedUrl, '_blank')
  }

  return (
    <Modal title="Comprovantes da dívida" onClose={onClose} width={720}>
      <div className="muted" style={{ fontSize: 12.5, marginTop: -6, marginBottom: 18 }}>
        {divida.descricao ? divida.descricao + ' · ' : ''}{formatBRL(divida.valor)} · vence {formatData(divida.data_vencimento)}
      </div>

      {/* Form novo boleto */}
      <div className="card card-pad" style={{ background: 'var(--surface-2)', marginBottom: 18 }}>
        <div className="eyebrow" style={{ color: 'var(--accent-2)', marginBottom: 14 }}>Adicionar boleto</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Field label="Vencimento"><input type="date" value={form.vencimento} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} /></Field>
          <Field label="Valor (R$)"><input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" /></Field>
          <Field label="Arquivo (PDF/img)"><input id="boleto-arquivo-input" type="file" accept="application/pdf,image/*" onChange={e => setForm(p => ({ ...p, arquivo: e.target.files?.[0] || null }))} /></Field>
        </div>
        <Field label="Código de barras / linha digitável">
          <input value={form.codigo_barras} onChange={e => setForm(p => ({ ...p, codigo_barras: e.target.value }))}
            placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }} />
        </Field>
        {erro && <div className="alert alert-danger" style={{ marginTop: 10 }}>{erro}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button variant="primary" size="sm" icon="plus" onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Adicionar boleto'}</Button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : boletos.length === 0 ? (
        <EmptyState icon="paperclip" title="Nenhum boleto">Nenhum boleto anexado a este protesto.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Vencimento</th><th className="num">Valor</th><th>Código de barras</th><th>Arquivo</th><th></th></tr>
            </thead>
            <tbody>
              {boletos.map(b => (
                <tr key={b.id}>
                  <td className="num cell-muted" style={{ fontSize: 12.5 }}>{formatData(b.vencimento)}</td>
                  <td className="num cell-strong">{b.valor ? formatBRL(b.valor) : '—'}</td>
                  <td className="num cell-muted cell-truncate" style={{ fontSize: 11.5, maxWidth: 220 }} title={b.codigo_barras || ''}>{b.codigo_barras || '—'}</td>
                  <td>
                    {b.arquivo_path
                      ? <Button size="sm" icon="open" onClick={() => abrirArquivo(b)}>Abrir</Button>
                      : <span className="dim">—</span>}
                  </td>
                  <td><Button size="sm" variant="danger" icon="trash" onClick={() => excluir(b)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="modal-actions">
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  )
}
