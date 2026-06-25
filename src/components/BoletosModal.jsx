import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatBRL, formatData } from '../lib/format'
import { Button, Field, Modal, Loading, EmptyState, Icon } from './ui'

const BUCKET = 'boletos'
const FORM_VAZIO = { codigo_barras: '', arquivo: null }

export default function BoletosModal({ divida, onClose, onChange }) {
  const [comprovantes, setComprovantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function load() {
    const { data } = await supabase
      .from('boletos')
      .select('*')
      .eq('divida_id', divida.id)
      .order('criado_em', { ascending: true })
    if (data) setComprovantes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [divida.id])

  async function salvar() {
    setErro('')
    if (!form.arquivo && !form.codigo_barras.trim()) {
      return setErro('Anexe o arquivo do boleto ou informe a linha digitável.')
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

    // valor/vencimento ficam nulos: o comprovante é só o documento, quem define
    // o valor e o vencimento é a própria dívida.
    const payload = {
      divida_id: divida.id,
      user_id: user.id,
      codigo_barras: form.codigo_barras.trim() || null,
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
    const input = document.getElementById('comprovante-arquivo-input')
    if (input) input.value = ''
    load()
    onChange?.()
  }

  async function excluir(b) {
    if (!confirm('Excluir este comprovante?')) return
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
    <Modal title="Comprovantes da dívida" onClose={onClose} width={640}>
      <div className="muted" style={{ fontSize: 12.5, marginTop: -6, marginBottom: 4 }}>
        {divida.descricao ? divida.descricao + ' · ' : ''}{formatBRL(divida.valor)} · vence {formatData(divida.data_vencimento)}
      </div>
      <p className="dim" style={{ fontSize: 12, marginBottom: 18 }}>
        Anexe aqui os boletos/documentos que comprovam esta dívida. Eles são apenas arquivos de apoio — não alteram o valor da dívida.
      </p>

      {/* Anexar comprovante */}
      <div className="card card-pad" style={{ background: 'var(--surface-2)', marginBottom: 18 }}>
        <div className="eyebrow" style={{ color: 'var(--accent-2)', marginBottom: 14 }}>Anexar comprovante</div>
        <Field label="Arquivo do boleto (PDF ou imagem)">
          <input id="comprovante-arquivo-input" type="file" accept="application/pdf,image/*"
            onChange={e => setForm(p => ({ ...p, arquivo: e.target.files?.[0] || null }))} />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Linha digitável / código de barras (opcional)">
          <input value={form.codigo_barras} onChange={e => setForm(p => ({ ...p, codigo_barras: e.target.value }))}
            placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }} />
        </Field>
        {erro && <div className="alert alert-danger" style={{ marginTop: 10 }}>{erro}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button variant="primary" size="sm" icon="plus" onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Anexar comprovante'}</Button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : comprovantes.length === 0 ? (
        <EmptyState icon="paperclip" title="Nenhum comprovante">Nenhum documento anexado a esta dívida ainda.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Documento</th><th>Linha digitável</th><th></th></tr>
            </thead>
            <tbody>
              {comprovantes.map(b => (
                <tr key={b.id}>
                  <td>
                    {b.arquivo_path ? (
                      <button className="link-doc" onClick={() => abrirArquivo(b)} title="Abrir arquivo">
                        <Icon name="paperclip" size={13} />
                        <span className="cell-truncate" style={{ maxWidth: 200 }}>{b.arquivo_nome || 'arquivo'}</span>
                        <Icon name="open" size={12} />
                      </button>
                    ) : <span className="dim">Sem arquivo</span>}
                  </td>
                  <td className="num cell-muted cell-truncate" style={{ fontSize: 11.5, maxWidth: 220 }} title={b.codigo_barras || ''}>{b.codigo_barras || '—'}</td>
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
