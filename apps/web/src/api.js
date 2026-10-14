const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`)
    this.status = status
    this.details = body?.details
  }
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function request(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data)
  }
  return data
}

export const api = {
  register: (name, email, password) => request('/auth/register', { body: { name, email, password } }),
  login: (email, password) => request('/auth/login', { body: { email, password } }),
  submitEnquiry: (enquiry) => request('/enquiries', { body: enquiry }),
  publicEnquiries: (token) => request('/enquiries/public', { token }),
  myEnquiries: (token) => request('/enquiries/mine', { token }),
  claim: (token, id) => request(`/enquiries/${id}/claim`, { token, method: 'PATCH' }),
}

// Maps zod field errors from the API to { field: message } for inline display.
export function fieldErrors(err) {
  return Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message]))
}
