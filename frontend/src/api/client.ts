import type { ApiInvoice, ApiInvoiceStatus, ApiPatient, ApiPractice, ApiProcedure, InvoiceCreate, PatientCreate } from './types'
import { mockApi } from './mock'

// Explicit env var wins. Otherwise: production builds default to a relative
// base (same-origin — for deployments that serve the API and the frontend
// from the same domain, e.g. Vercel), dev builds default to the local
// backend's port.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8000')

// If the real backend isn't reachable (e.g. only the frontend was deployed),
// every call transparently falls back to in-memory mock data so the UI stays
// testable. Once a call fails, later calls skip straight to the mock to
// avoid repeated slow timeouts.
let backendUnavailable = false
const listeners = new Set<() => void>()
function setUnavailable() {
  if (!backendUnavailable) {
    backendUnavailable = true
    listeners.forEach(l => l())
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`)
  }
  return res.json() as Promise<T>
}

async function withFallback<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  if (backendUnavailable) return mock()
  try {
    return await real()
  } catch {
    setUnavailable()
    return mock()
  }
}

export const api = {
  get isMock() {
    return backendUnavailable
  },
  onMockFallback: (cb: () => void) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  baseUrl: BASE_URL,
  listInvoices: () => withFallback(() => request<ApiInvoice[]>('/api/invoices'), mockApi.listInvoices),
  createInvoice: (data: InvoiceCreate) => withFallback(() => request<ApiInvoice>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }), () => mockApi.createInvoice(data)),
  updateInvoice: (id: number, data: InvoiceCreate) =>
    withFallback(() => request<ApiInvoice>(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }), () => mockApi.updateInvoice(id, data)),
  updateInvoiceStatus: (id: number, status: ApiInvoiceStatus) =>
    withFallback(() => request<{ ok: boolean; status: string }>(`/api/invoices/${id}/status?status=${status}`, { method: 'PATCH' }), () => mockApi.updateInvoiceStatus(id, status)),
  listPatients: (q = '') => withFallback(() => request<ApiPatient[]>(`/api/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`), () => mockApi.listPatients(q)),
  createPatient: (data: PatientCreate) => withFallback(() => request<ApiPatient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }), () => mockApi.createPatient(data)),
  listProcedures: () => withFallback(() => request<ApiProcedure[]>('/api/procedures'), mockApi.listProcedures),
  getPractice: () => withFallback(() => request<ApiPractice>('/api/practice'), mockApi.getPractice),
}
