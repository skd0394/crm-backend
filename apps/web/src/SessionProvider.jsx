import { useCallback, useEffect, useMemo, useState } from 'react'
import { setUnauthorizedHandler } from './api.js'
import { SessionContext } from './session.js'

const STORAGE_KEY = 'crm.session'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function save(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: the session just won't survive a reload.
  }
}

export default function SessionProvider({ children }) {
  const [session, setSession] = useState(load)

  const signIn = useCallback(({ token, employee }) => {
    const next = { token, employee }
    save(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    save(null)
    setSession(null)
  }, [])

  // An expired/invalid token on any request logs the user out.
  useEffect(() => setUnauthorizedHandler(signOut), [signOut])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
