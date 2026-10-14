import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, fieldErrors } from '../api.js'
import { useSession } from '../session.js'
import Field from '../Field.jsx'

export default function Login() {
  const { signIn } = useSession()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  function switchMode(next) {
    setMode(next)
    setErrors({})
    setMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      const result = isRegister
        ? await api.register(form.name, form.email, form.password)
        : await api.login(form.email, form.password)
      signIn(result)
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(err.details ? '' : err.message)
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <div className="card auth-card">
        <p className="brand">Counselor CRM</p>
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="stack">
          {isRegister && (
            <Field label="Full name" error={errors.name}>
              <input value={form.name} onChange={update('name')} autoComplete="name" required />
            </Field>
          )}
          <Field label="Work email" error={errors.email}>
            <input type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
          </Field>
          <Field label="Password" error={errors.password} hint={isRegister ? 'At least 8 characters' : undefined}>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </Field>
          {message && (
            <p className="alert" role="alert">
              {message}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
      <p className="muted center">
        Prospective student? <Link to="/enquire">Fill the enquiry form</Link>
      </p>
    </main>
  )
}
