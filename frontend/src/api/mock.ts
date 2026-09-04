import type { ApiInvoice, ApiInvoiceStatus, ApiPatient, ApiPractice, ApiProcedure, InvoiceCreate, PatientCreate } from './types'

// Used only when the real backend can't be reached (e.g. the frontend was
// deployed standalone, without the FastAPI API). Lets the UI stay testable
// on its own — nothing here is persisted anywhere.

export const MOCK_PRACTICE: ApiPractice = {
  id: 1,
  doctor_title: 'Dr. med.',
  doctor_first_name: 'Sarah',
  doctor_last_name: 'Mitchell',
  specialization: 'Fachärztin für Innere Medizin',
  practice_name: 'Praxis Dr. Mitchell',
  street: 'Unter den Linden 25',
  postal_code: '10117',
  city: 'Berlin',
  phone: '+49 30 1234567',
  email: 'praxis@dr-mitchell.de',
  steuernummer: '27/123/45678',
  ust_id: '',
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX',
  bank_name: 'Commerzbank',
  logo_url: '',
}

let _patients: ApiPatient[] = [
  { id: 1, anrede: 'Herr', first_name: 'Thomas', last_name: 'Weber', date_of_birth: '1978-05-14', street: 'Friedrichstr. 42', postal_code: '10117', city: 'Berlin', insurance_number: '', email: 'thomas.weber@mail.de' },
  { id: 2, anrede: 'Frau', first_name: 'Anna', last_name: 'Schneider', date_of_birth: '1985-11-22', street: 'Kantstr. 15', postal_code: '10623', city: 'Berlin', insurance_number: 'K123456789', email: 'anna.schneider@mail.de' },
  { id: 3, anrede: 'Frau', first_name: 'Maria', last_name: 'Becker', date_of_birth: '1992-03-08', street: 'Prenzlauer Allee 88', postal_code: '10405', city: 'Berlin', insurance_number: '', email: 'maria.becker@mail.de' },
  { id: 4, anrede: 'Herr', first_name: 'Jan', last_name: 'Fischer', date_of_birth: '1968-09-30', street: 'Kurfürstendamm 120', postal_code: '10711', city: 'Berlin', insurance_number: 'F987654321', email: 'jan.fischer@mail.de' },
]

export const MOCK_PROCEDURES: ApiProcedure[] = [
  { id: 1, goae_number: '1', description: 'Beratung', base_rate: 4.66, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 2, goae_number: '3', description: 'Eingehende Beratung (>10 min)', base_rate: 8.74, category: 'Persönlich', min_duration: '10 min', threshold_factor: 2.3 },
  { id: 3, goae_number: '5', description: 'Symptombezogene Untersuchung', base_rate: 4.66, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 4, goae_number: '7', description: 'Vollständige körperliche Untersuchung (mehrere Organsysteme)', base_rate: 8.74, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 5, goae_number: '8', description: 'Ganzkörperuntersuchung', base_rate: 15.15, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 6, goae_number: '250', description: 'Blutentnahme venös', base_rate: 2.33, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 7, goae_number: '410', description: 'Ultraschalluntersuchung eines Organs', base_rate: 11.66, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 8, goae_number: '651', description: 'EKG Ruhe-EKG', base_rate: 14.75, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 9, goae_number: '3501', description: 'Laboruntersuchung Blutbild (klein)', base_rate: 3.5, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
]

function invoice(partial: Partial<ApiInvoice> & { id: number; invoice_number: string; patient_id: number; patient_name: string }): ApiInvoice {
  return {
    issue_date: '2026-09-01',
    due_date: '2026-10-01',
    status: 'draft',
    diagnosis: '',
    doctor_name: 'Dr. med. Sarah Mitchell',
    subtotal_services: 0,
    subtotal_expenses: 0,
    vat_rate: 0,
    vat_amount: 0,
    total: 0,
    notes: '',
    line_items: [],
    expenses: [],
    pdf_url: '#',
    payment_url: '#',
    chat_url: '#',
    ...partial,
  }
}

let _invoices: ApiInvoice[] = [
  invoice({
    id: 1, invoice_number: 'RE-2026-0001', patient_id: 1, patient_name: 'Thomas Weber', status: 'paid',
    issue_date: '2026-08-05', due_date: '2026-09-04', diagnosis: 'Routineuntersuchung',
    subtotal_services: 96.05, total: 96.05,
    line_items: [
      { goae_number: '1', description: 'Beratung', service_date: '2026-08-04', quantity: 1, base_rate: 4.66, multiplier: 2.3, justification: '', is_verlangen: false, amount: 10.72 },
      { goae_number: '8', description: 'Ganzkörperuntersuchung', service_date: '2026-08-04', quantity: 1, base_rate: 15.15, multiplier: 2.3, justification: '', is_verlangen: false, amount: 34.85 },
    ],
  }),
  invoice({
    id: 2, invoice_number: 'RE-2026-0002', patient_id: 2, patient_name: 'Anna Schneider', status: 'sent',
    issue_date: '2026-08-30', due_date: '2026-09-29', diagnosis: 'Akute Bronchitis',
    subtotal_services: 139.02, subtotal_expenses: 12.5, total: 151.52,
    line_items: [
      { goae_number: '3', description: 'Eingehende Beratung (>10 min)', service_date: '2026-08-29', quantity: 1, base_rate: 8.74, multiplier: 2.3, justification: '', is_verlangen: false, amount: 20.1 },
      { goae_number: '410', description: 'Ultraschalluntersuchung eines Organs', service_date: '2026-08-29', quantity: 1, base_rate: 11.66, multiplier: 1.8, justification: '', is_verlangen: false, amount: 20.99 },
    ],
    expenses: [{ description: 'Medikamente (Antibiotikum)', amount: 12.5, receipt_required: false }],
  }),
  invoice({
    id: 3, invoice_number: 'RE-2026-0003', patient_id: 3, patient_name: 'Maria Becker', status: 'draft',
    issue_date: '2026-09-04', due_date: '2026-10-04', diagnosis: 'Vorsorgeuntersuchung',
    subtotal_services: 45.57, total: 45.57,
    line_items: [
      { goae_number: '1', description: 'Beratung', service_date: '2026-09-04', quantity: 1, base_rate: 4.66, multiplier: 2.3, justification: '', is_verlangen: false, amount: 10.72 },
      { goae_number: '8', description: 'Ganzkörperuntersuchung', service_date: '2026-09-04', quantity: 1, base_rate: 15.15, multiplier: 2.3, justification: '', is_verlangen: false, amount: 34.85 },
    ],
  }),
]

let _nextInvoiceId = 4
let _nextPatientId = 5

function computeInvoiceFields(data: InvoiceCreate) {
  const patient = _patients.find(p => p.id === data.patient_id)
  const line_items = (data.line_items ?? []).map(li => ({
    goae_number: li.goae_number,
    description: li.description ?? '',
    service_date: li.service_date ?? new Date().toISOString().split('T')[0],
    quantity: li.quantity ?? 1,
    base_rate: li.base_rate,
    multiplier: li.multiplier ?? 2.3,
    justification: li.justification ?? '',
    is_verlangen: li.is_verlangen ?? false,
    amount: Math.round(li.base_rate * (li.multiplier ?? 2.3) * (li.quantity ?? 1) * 100) / 100,
  }))
  const expenses = (data.expenses ?? []).map(e => ({ description: e.description, amount: e.amount, receipt_required: e.amount > 25.56 }))
  const subtotal_services = Math.round(line_items.reduce((s, li) => s + li.amount, 0) * 100) / 100
  const subtotal_expenses = Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100
  const vat_amount = Math.round(((subtotal_services + subtotal_expenses) * (data.vat_rate ?? 0)) / 100 * 100) / 100
  return {
    patient,
    patient_id: data.patient_id,
    patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
    issue_date: data.issue_date ?? new Date().toISOString().split('T')[0],
    due_date: data.due_date ?? null,
    diagnosis: data.diagnosis ?? '',
    notes: data.notes ?? '',
    vat_rate: data.vat_rate ?? 0,
    line_items,
    expenses,
    subtotal_services,
    subtotal_expenses,
    vat_amount,
    total: Math.round((subtotal_services + subtotal_expenses + vat_amount) * 100) / 100,
  }
}

export const mockApi = {
  listInvoices: async (): Promise<ApiInvoice[]> => [..._invoices],

  createInvoice: async (data: InvoiceCreate): Promise<ApiInvoice> => {
    const { patient: _patient, ...fields } = computeInvoiceFields(data)
    const year = new Date().getFullYear()
    const inv = invoice({
      id: _nextInvoiceId++,
      invoice_number: `RE-${year}-${String(_invoices.length + 1).padStart(4, '0')}`,
      ...fields,
    })
    _invoices = [inv, ..._invoices]
    return inv
  },

  updateInvoice: async (id: number, data: InvoiceCreate): Promise<ApiInvoice> => {
    const existing = _invoices.find(i => i.id === id)
    if (!existing) throw new Error('Invoice not found')
    const { patient: _patient, ...fields } = computeInvoiceFields(data)
    const updated = invoice({ ...existing, ...fields, id: existing.id, invoice_number: existing.invoice_number, status: existing.status })
    _invoices = _invoices.map(i => (i.id === id ? updated : i))
    return updated
  },

  updateInvoiceStatus: async (id: number, status: ApiInvoiceStatus) => {
    _invoices = _invoices.map(inv => (inv.id === id ? { ...inv, status } : inv))
    return { ok: true, status }
  },

  listPatients: async (q = ''): Promise<ApiPatient[]> =>
    q ? _patients.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q.toLowerCase())) : [..._patients],

  createPatient: async (data: PatientCreate): Promise<ApiPatient> => {
    const p: ApiPatient = {
      id: _nextPatientId++,
      anrede: data.anrede ?? 'Herr',
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth ?? null,
      street: data.street ?? '',
      postal_code: data.postal_code ?? '',
      city: data.city ?? '',
      insurance_number: data.insurance_number ?? '',
      email: data.email ?? '',
    }
    _patients = [..._patients, p]
    return p
  },

  listProcedures: async (): Promise<ApiProcedure[]> => [...MOCK_PROCEDURES],

  getPractice: async (): Promise<ApiPractice> => ({ ...MOCK_PRACTICE }),
}
