import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { useSession } from '../session.js'

const TABS = [
  { id: 'public', label: 'Unclaimed leads' },
  { id: 'mine', label: 'My leads' },
]

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

async function fetchLeads(token) {
  const [pub, mine] = await Promise.all([api.publicEnquiries(token), api.myEnquiries(token)])
  return { public: pub.enquiries, mine: mine.enquiries }
}

export default function Dashboard() {
  const { session, signOut } = useSession()
  const { token, employee } = session
  const [tab, setTab] = useState('public')
  const [leads, setLeads] = useState({ public: null, mine: null })
  const [error, setError] = useState('')
  const [claiming, setClaiming] = useState(null)
  const [notice, setNotice] = useState('')

  const load = useCallback(
    (isStale = () => false) =>
      fetchLeads(token).then(
        (next) => {
          if (isStale()) return
          setLeads(next)
          setError('')
        },
        (err) => !isStale() && setError(err.message),
      ),
    [token],
  )

  useEffect(() => {
    let stale = false
    load(() => stale)
    return () => {
      stale = true
    }
  }, [load])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 3000)
    return () => clearTimeout(id)
  }, [notice])

  async function claim(lead) {
    setClaiming(lead.id)
    try {
      const { enquiry } = await api.claim(token, lead.id)
      setLeads((l) => ({ public: l.public.filter((e) => e.id !== lead.id), mine: [enquiry, ...l.mine] }))
      setNotice(`${lead.name} is now in your leads.`)
    } catch (err) {
      if (err.status === 409 || err.status === 404) {
        // Someone else got there first: drop it from the public list.
        setLeads((l) => ({ ...l, public: l.public.filter((e) => e.id !== lead.id) }))
        setNotice(`${lead.name} was already claimed by another counselor.`)
      } else {
        setError(err.message)
      }
    } finally {
      setClaiming(null)
    }
  }

  async function copyFormLink() {
    const url = `${window.location.origin}/enquire`
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Enquiry form link copied.')
    } catch {
      setNotice(url)
    }
  }

  const list = leads[tab]

  return (
    <div className="app">
      <header className="topbar">
        <p className="brand">Counselor CRM</p>
        <div className="topbar-actions">
          <span className="muted hide-sm">{employee.email}</span>
          <button className="btn btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="container">
        <div className="page-head">
          <div>
            <h1>Hi, {employee.name.split(' ')[0]}</h1>
            <p className="muted">Claim an enquiry to make it yours. Claimed leads are hidden from everyone else.</p>
          </div>
          <div className="page-actions">
            <button className="btn" onClick={copyFormLink}>
              Copy form link
            </button>
            <button className="btn" onClick={() => load()}>
              Refresh
            </button>
          </div>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
              {leads[t.id] && <span className="count">{leads[t.id].length}</span>}
            </button>
          ))}
        </div>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {!list ? (
          !error && <p className="muted">Loading…</p>
        ) : list.length === 0 ? (
          <div className="empty card">
            {tab === 'public'
              ? 'No unclaimed enquiries right now. Share the form link to capture new leads.'
              : 'You haven’t claimed any leads yet.'}
          </div>
        ) : (
          <ul className="leads">
            {list.map((lead) => (
              <li key={lead.id} className="card lead">
                <div className="lead-main">
                  <div className="lead-title">
                    <h2>{lead.name}</h2>
                    <span className="tag">{lead.courseInterest}</span>
                  </div>
                  <p className="lead-contact">
                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                    {lead.phone && (
                      <>
                        {' · '}
                        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                      </>
                    )}
                  </p>
                  {lead.message && <p className="lead-message">{lead.message}</p>}
                  <p className="muted small">
                    {tab === 'public'
                      ? `Received ${dateFormat.format(new Date(lead.createdAt))}`
                      : `Claimed ${dateFormat.format(new Date(lead.claimedAt))}`}
                  </p>
                </div>
                {tab === 'public' && (
                  <button className="btn btn-primary" onClick={() => claim(lead)} disabled={claiming === lead.id}>
                    {claiming === lead.id ? 'Claiming…' : 'Claim'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="toast" role="status" aria-live="polite" data-visible={!!notice || undefined}>
        {notice}
      </div>
    </div>
  )
}
