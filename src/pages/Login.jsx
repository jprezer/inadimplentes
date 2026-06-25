import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Field, Icon } from '../components/ui'

export default function Login() {
  const [modo, setModo] = useState('login')
  const [usuario, setUsuario] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  function trocarModo(novoModo) {
    setModo(novoModo)
    setErro(''); setSucesso(''); setUsuario(''); setSenha(''); setConfirmarSenha('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!email.trim() || !senha.trim()) return setErro('Preencha todos os campos.')

    if (modo === 'cadastro') {
      if (!usuario.trim()) return setErro('Nome de usuário é obrigatório.')
      if (senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.')
      if (senha !== confirmarSenha) return setErro('As senhas não coincidem.')
      setLoading(true)
      const { error } = await supabase.auth.signUp({ email, password: senha, options: { data: { usuario } } })
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }} className="rise">
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div className="brand-mark" style={{ width: 48, height: 48, margin: '0 auto 16px' }}><Icon name="shield" size={24} /></div>
          <h1 style={{ fontSize: 22 }}>Controle de Protestos</h1>
          <div className="brand-tag" style={{ marginTop: 4 }}>AutoPeças</div>
        </div>

        <div className="segmented" style={{ marginBottom: 16 }}>
          {['login', 'cadastro'].map(m => (
            <button key={m} onClick={() => trocarModo(m)} className={modo === m ? 'on' : ''}>
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {modo === 'cadastro' && (
            <Field label="Usuário"><input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Ex: maria" autoFocus /></Field>
          )}
          <Field label="E-mail"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus={modo === 'login'} /></Field>
          <Field label="Senha"><input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" /></Field>
          {modo === 'cadastro' && (
            <Field label="Confirmar senha"><input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="••••••••" /></Field>
          )}

          {erro && <div className="alert alert-danger">{erro}</div>}
          {sucesso && <div className="alert alert-success">{sucesso}</div>}

          <Button type="submit" variant="primary" disabled={loading} style={{ marginTop: 4, padding: '11px 0' }}>
            {loading ? (modo === 'login' ? 'Entrando...' : 'Criando conta...') : (modo === 'login' ? 'Entrar' : 'Criar conta')}
          </Button>
        </form>
      </div>
    </div>
  )
}
