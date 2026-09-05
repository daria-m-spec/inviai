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
  { id: 5, anrede: 'Frau', first_name: 'Lena', last_name: 'Hoffmann', date_of_birth: '1990-07-19', street: 'Torstr. 55', postal_code: '10119', city: 'Berlin', insurance_number: 'L456789123', email: 'lena.hoffmann@mail.de' },
  { id: 6, anrede: 'Herr', first_name: 'Michael', last_name: 'Bauer', date_of_birth: '1975-02-27', street: 'Karl-Marx-Str. 210', postal_code: '12043', city: 'Berlin', insurance_number: '', email: 'michael.bauer@mail.de' },
  { id: 7, anrede: 'Frau', first_name: 'Sophie', last_name: 'Wagner', date_of_birth: '1988-12-03', street: 'Bergmannstr. 33', postal_code: '10961', city: 'Berlin', insurance_number: 'S321654987', email: 'sophie.wagner@mail.de' },
  { id: 8, anrede: 'Herr', first_name: 'David', last_name: 'Schulz', date_of_birth: '1995-06-11', street: 'Warschauer Str. 70', postal_code: '10243', city: 'Berlin', insurance_number: '', email: 'david.schulz@mail.de' },
  { id: 9, anrede: 'Frau', first_name: 'Julia', last_name: 'Krüger', date_of_birth: '1982-04-25', street: 'Danziger Str. 12', postal_code: '10435', city: 'Berlin', insurance_number: 'J159753468', email: 'julia.krueger@mail.de' },
  { id: 10, anrede: 'Herr', first_name: 'Peter', last_name: 'Zimmermann', date_of_birth: '1965-10-08', street: 'Schönhauser Allee 145', postal_code: '10437', city: 'Berlin', insurance_number: '', email: 'peter.zimmermann@mail.de' },
]

export const MOCK_PROCEDURES: ApiProcedure[] = [
  { id: 1, goae_number: '1', description: 'Beratung', base_rate: 4.66, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 2, goae_number: '3', description: 'Eingehende Beratung (>10 min)', base_rate: 8.74, category: 'Persönlich', min_duration: '10 min', threshold_factor: 2.3 },
  { id: 3, goae_number: '5', description: 'Symptombezogene Untersuchung', base_rate: 4.66, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 4, goae_number: '6', description: 'Vollständige körperliche Untersuchung (mind. 1 Organsystem)', base_rate: 5.83, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 5, goae_number: '7', description: 'Vollständige körperliche Untersuchung (mehrere Organsysteme)', base_rate: 8.74, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 6, goae_number: '8', description: 'Ganzkörperuntersuchung', base_rate: 15.15, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 7, goae_number: '34', description: 'Erörterung der Auswirkungen einer Krankheit', base_rate: 17.49, category: 'Persönlich', min_duration: '20 min', threshold_factor: 2.3 },
  { id: 8, goae_number: '75', description: 'Ausführlicher Arztbericht', base_rate: 7.58, category: 'Persönlich', min_duration: '', threshold_factor: 2.3 },
  { id: 9, goae_number: '250', description: 'Blutentnahme venös', base_rate: 2.33, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 10, goae_number: '410', description: 'Ultraschalluntersuchung eines Organs', base_rate: 11.66, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 11, goae_number: '420', description: 'Ultraschalluntersuchung von bis zu 3 Organen', base_rate: 29.14, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 12, goae_number: '602', description: 'Oxymetrische Untersuchung (Pulsoxymetrie)', base_rate: 8.16, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 13, goae_number: '651', description: 'EKG Ruhe-EKG', base_rate: 14.75, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 14, goae_number: '652', description: 'EKG Belastungs-EKG', base_rate: 25.94, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 15, goae_number: '3501', description: 'Laboruntersuchung Blutbild (klein)', base_rate: 3.5, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 16, goae_number: '3550', description: 'Laboruntersuchung Blutzucker', base_rate: 2.33, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
  { id: 17, goae_number: '3585', description: 'Laboruntersuchung Cholesterin', base_rate: 2.33, category: 'Technisch', min_duration: '', threshold_factor: 1.8 },
]

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function plusDaysIso(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function buildLineItems(items: { goae: string; qty?: number }[], serviceDate: string) {
  return items.map(({ goae, qty = 1 }) => {
    const proc = MOCK_PROCEDURES.find(p => p.goae_number === goae)!
    const amount = Math.round(proc.base_rate * proc.threshold_factor * qty * 100) / 100
    return {
      goae_number: proc.goae_number, description: proc.description, service_date: serviceDate,
      quantity: qty, base_rate: proc.base_rate, multiplier: proc.threshold_factor,
      justification: '', is_verlangen: false, amount,
    }
  })
}

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

interface SeedInvoiceSpec {
  patientId: number
  status: ApiInvoiceStatus
  daysSinceIssue: number
  /** Days ago the due date fell — null defaults it to issue date + 30 days. */
  daysSinceDue: number | null
  diagnosis: string
  items: { goae: string; qty?: number }[]
  expenses?: { description: string; amount: number }[]
}

function seedInvoice(seq: number, spec: SeedInvoiceSpec): ApiInvoice {
  const patient = _patients.find(p => p.id === spec.patientId)!
  const issue_date = daysAgoIso(spec.daysSinceIssue)
  const due_date = spec.daysSinceDue !== null ? daysAgoIso(spec.daysSinceDue) : plusDaysIso(issue_date, 30)
  const line_items = buildLineItems(spec.items, issue_date)
  const expenses = (spec.expenses ?? []).map(e => ({ ...e, receipt_required: e.amount > 25.56 }))
  const subtotal_services = Math.round(line_items.reduce((s, li) => s + li.amount, 0) * 100) / 100
  const subtotal_expenses = Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100
  return invoice({
    id: seq,
    invoice_number: `RE-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
    patient_id: patient.id,
    patient_name: `${patient.first_name} ${patient.last_name}`,
    status: spec.status,
    issue_date, due_date,
    diagnosis: spec.diagnosis,
    line_items, expenses,
    subtotal_services, subtotal_expenses,
    total: Math.round((subtotal_services + subtotal_expenses) * 100) / 100,
  })
}

let _invoices: ApiInvoice[] = [
  seedInvoice(1, { patientId: 1, status: 'paid', daysSinceIssue: 35, daysSinceDue: 5, diagnosis: 'Routineuntersuchung', items: [{ goae: '1' }, { goae: '8' }, { goae: '651' }, { goae: '250' }, { goae: '3501' }] }),
  seedInvoice(2, { patientId: 2, status: 'sent', daysSinceIssue: 10, daysSinceDue: null, diagnosis: 'Akute Bronchitis', items: [{ goae: '3' }, { goae: '410' }, { goae: '250' }], expenses: [{ description: 'Medikamente (Antibiotikum)', amount: 12.5 }] }),
  seedInvoice(3, { patientId: 3, status: 'draft', daysSinceIssue: 0, daysSinceDue: null, diagnosis: 'Vorsorgeuntersuchung', items: [{ goae: '1' }, { goae: '8' }] }),
  seedInvoice(4, { patientId: 4, status: 'paid', daysSinceIssue: 60, daysSinceDue: 30, diagnosis: 'Kontrolluntersuchung nach OP', items: [{ goae: '7' }, { goae: '651' }, { goae: '3501' }] }),
  seedInvoice(5, { patientId: 5, status: 'overdue', daysSinceIssue: 45, daysSinceDue: 15, diagnosis: 'Migräne Abklärung', items: [{ goae: '34' }, { goae: '1' }] }),
  seedInvoice(6, { patientId: 6, status: 'viewed', daysSinceIssue: 5, daysSinceDue: null, diagnosis: 'Rückenschmerzen', items: [{ goae: '6' }, { goae: '652' }] }),
  seedInvoice(7, { patientId: 7, status: 'cancelled', daysSinceIssue: 20, daysSinceDue: null, diagnosis: 'Erkältung', items: [{ goae: '1' }] }),
  seedInvoice(8, { patientId: 8, status: 'sent', daysSinceIssue: 3, daysSinceDue: null, diagnosis: 'Sportverletzung Knie', items: [{ goae: '7' }, { goae: '410' }], expenses: [{ description: 'Verbandmaterial', amount: 8.9 }] }),
  seedInvoice(9, { patientId: 9, status: 'paid', daysSinceIssue: 90, daysSinceDue: 60, diagnosis: 'Jahresuntersuchung', items: [{ goae: '8' }, { goae: '651' }, { goae: '3501' }, { goae: '3550' }, { goae: '3585' }] }),
  seedInvoice(10, { patientId: 10, status: 'draft', daysSinceIssue: 2, daysSinceDue: null, diagnosis: 'Bluthochdruck Kontrolle', items: [{ goae: '1' }, { goae: '602' }] }),
  seedInvoice(11, { patientId: 1, status: 'sent', daysSinceIssue: 25, daysSinceDue: null, diagnosis: 'Grippeimpfung', items: [{ goae: '1' }, { goae: '250' }], expenses: [{ description: 'Grippeimpfstoff', amount: 18.3 }] }),
  seedInvoice(12, { patientId: 2, status: 'overdue', daysSinceIssue: 50, daysSinceDue: 20, diagnosis: 'Nachuntersuchung Bronchitis', items: [{ goae: '3' }] }),
  seedInvoice(13, { patientId: 6, status: 'paid', daysSinceIssue: 100, daysSinceDue: 70, diagnosis: 'Check-up', items: [{ goae: '7' }, { goae: '651' }] }),
  seedInvoice(14, { patientId: 7, status: 'viewed', daysSinceIssue: 8, daysSinceDue: null, diagnosis: 'Hautausschlag', items: [{ goae: '5' }] }),
]

let _nextInvoiceId = 15
let _nextPatientId = 11

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
