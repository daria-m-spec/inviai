import type { ApiInvoiceStatus, Anrede } from '../api/types'

export const STATUS_LABEL: Record<ApiInvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export const STATUS_STYLE: Record<ApiInvoiceStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
  sent: { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  viewed: { bg: '#ede9fe', text: '#6d28d9', dot: '#7c3aed' },
  paid: { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  overdue: { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db' },
}

export function fmtDate(s?: string | null) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

export function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function monthsAgo(dateStr: string, months: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() - months)
  return d.toISOString().split('T')[0]
}

// UI title options, mapped to the backend's German Anrede enum on submit.
export const ANREDE_OPTS: { label: string; value: Anrede }[] = [
  { label: 'Mr', value: 'Herr' },
  { label: 'Ms', value: 'Frau' },
  { label: 'Other', value: 'Divers' },
]

// Fallback practice info shown until /api/practice resolves.
export const DEFAULT_PRAXIS = {
  doctor_title: 'Dr.',
  doctor_first_name: 'Sarah',
  doctor_last_name: 'Mitchell',
  specialization: 'General Practice',
  practice_name: 'Practice Dr. Mitchell',
  street: '12 Muster St',
  postal_code: '10115',
  city: 'Berlin',
  phone: '+49 30 1234567',
  email: 'sarah.mitchell@praxis-mitchell.de',
  steuernummer: '27/445/05705',
  ust_id: '',
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX',
  bank_name: '',
}

export interface CatalogueProcedure {
  id: number
  name: string
  price: number
  unit: string
  code: string
  type: string
  available: boolean
}

export const CAT_PROCEDURES: CatalogueProcedure[] = [
  { id: 1, name: 'Initial Consultation', price: 150, unit: 'visit', code: '99213', type: 'Suggested', available: true },
  { id: 2, name: 'Follow-up Consultation', price: 100, unit: 'visit', code: '99214', type: 'Suggested', available: true },
  { id: 3, name: 'Complete Blood Count', price: 85, unit: 'test', code: '85025', type: 'Tests', available: true },
  { id: 4, name: 'Lipid Panel', price: 95, unit: 'test', code: '80061', type: 'Tests', available: true },
  { id: 5, name: 'Urinalysis', price: 45, unit: 'test', code: '81003', type: 'Tests', available: false },
  { id: 6, name: 'Thyroid Panel', price: 120, unit: 'test', code: '84443', type: 'Tests', available: true },
  { id: 7, name: 'HbA1c', price: 75, unit: 'test', code: '83036', type: 'Tests', available: true },
  { id: 8, name: 'Chest X-Ray', price: 175, unit: 'image', code: '71046', type: 'Tests', available: true },
  { id: 9, name: 'ECG 12-lead', price: 120, unit: 'procedure', code: '93000', type: 'Suggested', available: true },
  { id: 10, name: 'Influenza Vaccine', price: 65, unit: 'dose', code: '90658', type: 'Medicine', available: true },
  { id: 11, name: 'Hepatitis B Vaccine', price: 85, unit: 'dose', code: '90746', type: 'Medicine', available: true },
  { id: 12, name: 'Amoxicillin 500mg', price: 25, unit: 'course', code: 'J0290', type: 'Medicine', available: false },
  { id: 13, name: 'Metformin 850mg', price: 18, unit: 'pack', code: 'S0091', type: 'Medicine', available: true },
  { id: 14, name: 'Pap Smear', price: 90, unit: 'procedure', code: '88141', type: 'For women', available: true },
  { id: 15, name: 'Mammography', price: 220, unit: 'image', code: '77067', type: 'For women', available: true },
  { id: 16, name: 'Pelvic Ultrasound', price: 240, unit: 'image', code: '76856', type: 'For women', available: true },
  { id: 17, name: 'Prenatal Panel', price: 310, unit: 'panel', code: '80055', type: 'For women', available: true },
  { id: 18, name: 'Appendectomy', price: 4200, unit: 'procedure', code: '44950', type: 'Surgeries', available: true },
  { id: 19, name: 'Cholecystectomy', price: 5800, unit: 'procedure', code: '47562', type: 'Surgeries', available: false },
  { id: 20, name: 'Knee Arthroscopy', price: 6500, unit: 'procedure', code: '29881', type: 'Surgeries', available: true },
  { id: 21, name: 'Hernia Repair', price: 3800, unit: 'procedure', code: '49505', type: 'Surgeries', available: true },
  { id: 22, name: 'Physical Exam Adult', price: 200, unit: 'visit', code: '99395', type: 'Suggested', available: true },
  { id: 23, name: 'Abdominal Ultrasound', price: 250, unit: 'image', code: '76700', type: 'Tests', available: true },
  { id: 24, name: 'MRI Brain', price: 850, unit: 'image', code: '70553', type: 'Tests', available: false },
  { id: 25, name: 'Dental Exam', price: 180, unit: 'visit', code: 'D0150', type: 'Suggested', available: true },
]

export const CAT_TYPES = ['All procedures', 'Suggested', 'Tests', 'Medicine', 'For women', 'Surgeries']
