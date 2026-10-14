import { useState } from 'react'
import { api, fieldErrors } from '../api.js'
import Field from '../Field.jsx'

const EMPTY = { name: '', email: '', phone: '', courseInterest: '', message: '' }
const COURSES = ['MBA', 'Data Science', 'Computer Science', 'Digital Marketing', 'Design', 'Finance']

// Public enquiry form: no login, shareable link for prospective students.
export default function Enquire() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setMessage('')
    // Optional fields are omitted rather than sent empty.
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''))
    try {
      await api.submitEnquiry(payload)
      setDone(true)
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(err.details ? 'Please fix the highlighted fields.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <main className="auth">
        <div className="card auth-card center">
          <p className="success-icon" aria-hidden="true">✓</p>
          <h1>Thanks, we’ve got your enquiry!</h1>
          <p className="muted">A counselor will reach out to you shortly.</p>
          <button
            className="btn"
            onClick={() => {
              setForm(EMPTY)
              setDone(false)
            }}
          >
            Submit another enquiry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="auth">
      <div className="card auth-card">
        <p className="brand">Course enquiry</p>
        <h1>Tell us what you’d like to study</h1>
        <p className="muted">Share your details and a counselor will get in touch.</p>

        <form onSubmit={handleSubmit} noValidate className="stack">
          <Field label="Full name" error={errors.name}>
            <input value={form.name} onChange={update('name')} autoComplete="name" required />
          </Field>
          <div className="row">
            <Field label="Email" error={errors.email}>
              <input type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
            </Field>
            <Field label="Phone (optional)" error={errors.phone}>
              <input type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
            </Field>
          </div>
          <Field label="Course of interest" error={errors.courseInterest}>
            <input value={form.courseInterest} onChange={update('courseInterest')} list="courses" required />
          </Field>
          <datalist id="courses">
            {COURSES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field label="Message (optional)" error={errors.message}>
            <textarea rows={3} value={form.message} onChange={update('message')} />
          </Field>
          {message && (
            <p className="alert" role="alert">
              {message}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit enquiry'}
          </button>
        </form>
      </div>
    </main>
  )
}
