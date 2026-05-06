import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET = 'boletos'

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatData(d) {
  if (!d) return '—'
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
    </div>
  )
}

const FORM_VAZIO = { vencimento: '', codigo_barras: '', valor: '', arquivo: null }

export default function BoletosModal({ protesto, onClose, onChange }) {
  const [boletos, setBoletos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function load() {
    const { data } = await supabase
      .from('boletos')
      .select('*')
      .eq('protesto_id', protesto.id)
      .order('vencimento', { ascending: true, nullsFirst: false })
    if (data) setBoletos(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [protesto.id])

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
      arquivo_path = `${user.id}/${protesto.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(arquivo_path, form.arquivo)
      if (upErr) {
        setSaving(false)
        return setErro('Falha no upload: ' + upErr.message)
      }
    }

    const payload = {
      protesto_id: protesto.id,
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
    document.getElementById('boleto-arquivo-input').value = ''
    load()
    onChange?.()
  }

  async function excluir(b) {
    if (!confirm('Excluir este boleto?')) return
    if (b.arquivo_path) {
      await supabase.storage.from(BUCKET).remove([b.arquivo_path])
    }
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Boletos do protesto</span>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text2)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 20 }}>
          {formatData(protesto.data_protesto)} · {formatBRL(protesto.valor)} · {protesto.quantidade_boletos} boleto(s) declarado(s)
        </div>

        {/* Form novo boleto */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Adicionar boleto</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="Vencimento">
              <input type="date" value={form.vencimento} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} />
            </Field>
            <Field label="Valor (R$)">
              <input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
            </Field>
            <Field label="Arquivo (PDF/imagem)">
              <input id="boleto-arquivo-input" type="file" accept="application/pdf,image/*"
                onChange={e => setForm(p => ({ ...p, arquivo: e.target.files?.[0] || null }))} />
            </Field>
          </div>
          <Field label="Código de barras / linha digitável">
            <input value={form.codigo_barras} onChange={e => setForm(p => ({ ...p, codigo_barras: e.target.value }))}
              placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }} />
          </Field>
          {erro && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 10 }}>{erro}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={salvar} disabled={saving} style={{ background: 'var(--accent)', color: '#0f0f0f', padding: '7px 16px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 12 }}>
              {saving ? 'Salvando...' : '+ Adicionar boleto'}
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Carregando...</div>
        ) : boletos.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Nenhum boleto cadastrado.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Vencimento', 'Valor', 'Código de barras', 'Arquivo', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boletos.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{formatData(b.vencimento)}</td>
                  <td style={{ padding: '10px', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 12 }}>{b.valor ? formatBRL(b.valor) : '—'}</td>
                  <td style={{ padding: '10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.codigo_barras || ''}>
                    {b.codigo_barras || '—'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {b.arquivo_path ? (
                      <button onClick={() => abrirArquivo(b)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: 11 }}>
                        ↗ Abrir
                      </button>
                    ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => excluir(b)} style={{ background: 'transparent', border: '1px solid rgba(224,92,92,0.3)', color: 'var(--red)', padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: 11 }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 12 }}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
