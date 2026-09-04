export type Anrede = 'Herr' | 'Frau' | 'Divers'

export interface ApiPatient {
  id: number
  anrede: Anrede
  first_name: string
  last_name: string
  date_of_birth: string | null
  street: string
  postal_code: string
  city: string
  insurance_number: string
  email: string
}

export interface ApiProcedure {
  id: number
  goae_number: string
  description: string
  base_rate: number
  category: string
  min_duration: string
  threshold_factor: number
}

export interface ApiPractice {
  id: number
  doctor_title: string
  doctor_first_name: string
  doctor_last_name: string
  specialization: string
  practice_name: string
  street: string
  postal_code: string
  city: string
  phone: string
  email: string
  steuernummer: string
  ust_id: string
  iban: string
  bic: string
  bank_name: string
  logo_url: string
}

export interface ApiLineItem {
  goae_number: string
  description: string
  service_date: string
  quantity: number
  base_rate: number
  multiplier: number
  justification: string
  is_verlangen: boolean
  amount: number
}

export interface ApiExpense {
  description: string
  amount: number
  receipt_required: boolean
}

export type ApiInvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'

export interface ApiInvoice {
  id: number
  invoice_number: string
  issue_date: string
  due_date: string | null
  status: ApiInvoiceStatus
  diagnosis: string
  patient_id: number
  patient_name: string
  doctor_name: string
  subtotal_services: number
  subtotal_expenses: number
  vat_rate: number
  vat_amount: number
  total: number
  notes: string
  line_items: ApiLineItem[]
  expenses: ApiExpense[]
  pdf_url: string
  payment_url: string
  chat_url: string
}

export interface LineItemCreate {
  goae_number: string
  description?: string
  service_date?: string | null
  quantity?: number
  base_rate: number
  multiplier?: number
  justification?: string
  is_verlangen?: boolean
}

export interface ExpenseCreate {
  description: string
  amount: number
}

export interface InvoiceCreate {
  patient_id: number
  diagnosis?: string
  issue_date?: string | null
  due_date?: string | null
  vat_rate?: number
  notes?: string
  line_items?: LineItemCreate[]
  expenses?: ExpenseCreate[]
}

export interface PatientCreate {
  anrede?: Anrede
  first_name: string
  last_name: string
  date_of_birth?: string | null
  street?: string
  postal_code?: string
  city?: string
  insurance_number?: string
  email?: string
}
