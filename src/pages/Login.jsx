import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [modo, setModo] = useState('login') // 'login' | 'cadastro'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  function trocarModo(novoModo) {
    setModo(novoModo)
    setErro('')
    setSucesso('')
    setSenha('')
    setConfirmarSenha('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    if (!email.trim() || !senha.trim()) return setErro('Preencha todos os campos.')

    if (modo === 'cadastro') {
      if (senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.')
      if (senha !== confirmarSenha) return setErro('As senhas não coincidem.')
      setLoading(true)
      const { error } = await supabase.auth.signUp({ email, password: senha })
      setLoading(false)
      if (error) return setErro(error.message)
      setSucesso('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setLoading(false)
    if (error) setErro('E-mail ou senha incorretos.')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
            AutoPeças
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
            Controle de Protestos
          </div>
        </div>

        {/* Toggle login/cadastro */}
        <div style={{
          display: 'flex',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 4,
          marginBottom: 16,
        }}>
          {['login', 'cadastro'].map(m => (
            <button
              key={m}
              onClick={() => trocarModo(m)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                background: modo === m ? 'var(--bg3)' : 'transparent',
                color: modo === m ? 'var(--text)' : 'var(--text3)',
                border: modo === m ? '1px solid var(--border2)' : '1px solid transparent',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {modo === 'cadastro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Confirmar senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {erro && (
            <div style={{ color: 'var(--red)', fontSize: 12, background: 'var(--red-bg)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
              {erro}
            </div>
          )}

          {sucesso && (
            <div style={{ color: 'var(--green)', fontSize: 12, background: 'var(--green-bg)', border: '1px solid rgba(92,184,122,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
              {sucesso}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--accent)', color: '#0f0f0f',
              padding: '10px 0', borderRadius: 'var(--radius)',
              fontWeight: 600, fontSize: 14,
              opacity: loading ? 0.6 : 1,
              marginTop: 4,
            }}>
            {loading ? (modo === 'login' ? 'Entrando...' : 'Criando conta...') : (modo === 'login' ? 'Entrar' : 'Criar conta')}
          </button>
        </form>
      </div>
    </div>
  )
}
