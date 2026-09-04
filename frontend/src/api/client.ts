import type { ApiInvoice, ApiInvoiceStatus, ApiPatient, ApiPractice, ApiProcedure, InvoiceCreate, PatientCreate } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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

export const api = {
  baseUrl: BASE_URL,
  listInvoices: () => request<ApiInvoice[]>('/api/invoices'),
  createInvoice: (data: InvoiceCreate) => request<ApiInvoice>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoiceStatus: (id: number, status: ApiInvoiceStatus) => request<{ ok: boolean; status: string }>(`/api/invoices/${id}/status?status=${status}`, { method: 'PATCH' }),
  listPatients: (q = '') => request<ApiPatient[]>(`/api/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createPatient: (data: PatientCreate) => request<ApiPatient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
  listProcedures: () => request<ApiProcedure[]>('/api/procedures'),
  getPractice: () => request<ApiPractice>('/api/practice'),
}
