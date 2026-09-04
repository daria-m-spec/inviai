import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { api } from '../../api/client'
import type { ApiInvoice, ApiPatient, ApiProcedure, ApiPractice, Anrede } from '../../api/types'
import { ANREDE_OPTS, addDays, DEFAULT_PRAXIS } from '../../data/inviai'

interface LineItem {
  id: number
  goaNr: string
  desc: string
  baseRate: number
  serviceDate: string
  qty: number
  multiplier: number
  justification: string
  verlangen: boolean
}

interface Material {
  id: number
  name: string
  amount: number | string
}

interface NewInvoiceModalProps {
  onClose: () => void
  onSave: (invoice: ApiInvoice) => void
}

const inp: CSSProperties = { width: '100%', height: '2.125rem', padding: '0 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', background: 'transparent', color: 'var(--foreground)', outline: 'none' }
const lbl: CSSProperties = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
const sec: CSSProperties = { background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1rem', width: '880px' }

function qrImage(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=216A56&data=${encodeURIComponent(url)}`
}

export function NewInvoiceModal({ onClose, onSave }: NewInvoiceModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(addDays(today, 30))
  const [diagnosis, setDiagnosis] = useState('')

  const [practice, setPractice] = useState<ApiPractice | null>(null)
  const [patients, setPatients] = useState<ApiPatient[]>([])
  const [procedures, setProcedures] = useState<ApiProcedure[]>([])

  useEffect(() => {
    api.getPractice().then(setPractice).catch(() => {})
    api.listPatients().then(setPatients).catch(() => {})
    api.listProcedures().then(setProcedures).catch(() => {})
  }, [])

  const praxis = practice
    ? {
        arztName: `${practice.doctor_title} ${practice.doctor_first_name} ${practice.doctor_last_name}`.trim(),
        fachgebiet: practice.specialization,
        praxisName: practice.practice_name,
        adresse: `${practice.street}, ${practice.postal_code} ${practice.city}`.trim(),
        telefon: practice.phone,
        email: practice.email,
        steuernummer: practice.steuernummer,
        iban: practice.iban,
        bic: practice.bic,
      }
    : {
        arztName: `${DEFAULT_PRAXIS.doctor_title} ${DEFAULT_PRAXIS.doctor_first_name} ${DEFAULT_PRAXIS.doctor_last_name}`.trim(),
        fachgebiet: DEFAULT_PRAXIS.specialization,
        praxisName: DEFAULT_PRAXIS.practice_name,
        adresse: `${DEFAULT_PRAXIS.street}, ${DEFAULT_PRAXIS.postal_code} ${DEFAULT_PRAXIS.city}`,
        telefon: DEFAULT_PRAXIS.phone,
        email: DEFAULT_PRAXIS.email,
        steuernummer: DEFAULT_PRAXIS.steuernummer,
        iban: DEFAULT_PRAXIS.iban,
        bic: DEFAULT_PRAXIS.bic,
      }

  // Patient
  const [anrede, setAnrede] = useState<Anrede>('Herr')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [dob, setDob] = useState('')
  const [versNr, setVersNr] = useState('')
  const [patEmail, setPatEmail] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postal, setPostal] = useState('')
  const [newPatientMode, setNewPatientMode] = useState(false)
  const [selectedPat, setSelectedPat] = useState<ApiPatient | null>(null)
  const [patDropOpen, setPatDropOpen] = useState(false)
  const [patQ, setPatQ] = useState('')
  const patPickRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (patPickRef.current && !patPickRef.current.contains(e.target as Node)) setPatDropOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selectPatient = (p: ApiPatient) => {
    setSelectedPat(p)
    setAnrede(p.anrede)
    setVorname(p.first_name)
    setNachname(p.last_name)
    setDob(p.date_of_birth || '')
    setVersNr(p.insurance_number || '')
    setStreet(p.street || '')
    setCity(p.city || '')
    setPostal(p.postal_code || '')
    setPatEmail(p.email || '')
    setNewPatientMode(false)
    setPatDropOpen(false)
    setPatQ('')
  }

  // Line items
  const [items, setItems] = useState<LineItem[]>([])
  const [goaQ, setGoaQ] = useState<Record<number, string>>({})
  const [showGoaDrop, setShowGoaDrop] = useState<Record<number, boolean>>({})

  // Materials
  const [mats, setMats] = useState<Material[]>([])

  // Notes
  const [notes, setNotes] = useState('')
  const [zahlungshinweis, setZahlungshinweis] = useState('Please transfer the invoice amount within 30 days to the specified account.')
  const [mahnhinweis, setMahnhinweis] = useState('In case of late payment, reminder fees will be charged pursuant to § 288 BGB.')

  const [vatRate, setVatRate] = useState(0)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Result of a successful save
  const [saved, setSaved] = useState<ApiInvoice | null>(null)
  const [sendEmail, setSendEmail] = useState('')
  const [sendDesc, setSendDesc] = useState('')
  const [sendSent, setSendSent] = useState(false)

  const addItem = () =>
    setItems(it => [...it, { id: Date.now(), goaNr: '', desc: '', baseRate: 0, serviceDate: today, qty: 1, multiplier: 2.3, justification: '', verlangen: false }])
  const updateItem = (id: number, key: keyof LineItem, val: LineItem[keyof LineItem]) =>
    setItems(it =>
      it.map(x => {
        if (x.id !== id) return x
        const u = { ...x, [key]: val }
        if (key === 'goaNr') {
          const ref = procedures.find(g => g.goae_number === val)
          if (ref) {
            u.desc = ref.description
            u.baseRate = ref.base_rate
            u.multiplier = ref.threshold_factor
          }
        }
        return u
      })
    )
  const removeItem = (id: number) => setItems(it => it.filter(x => x.id !== id))
  const selectGoa = (id: number, g: ApiProcedure) => {
    setItems(it => it.map(x => (x.id === id ? { ...x, goaNr: g.goae_number, desc: g.description, baseRate: g.base_rate, multiplier: g.threshold_factor } : x)))
    setShowGoaDrop(s => ({ ...s, [id]: false }))
    setGoaQ(q => ({ ...q, [id]: g.goae_number + ' – ' + g.description }))
  }

  const addMat = () => setMats(m => [...m, { id: Date.now(), name: '', amount: 0 }])
  const updateMat = (id: number, key: keyof Material, val: Material[keyof Material]) => setMats(m => m.map(x => (x.id === id ? { ...x, [key]: val } : x)))
  const removeMat = (id: number) => setMats(m => m.filter(x => x.id !== id))

  const serviceTotal = items.reduce((s, i) => s + i.baseRate * i.multiplier * i.qty, 0)
  const matTotal = mats.reduce((s, m) => s + (+m.amount || 0), 0)
  const subtotal = serviceTotal + matTotal
  const vatAmt = (subtotal * vatRate) / 100
  const grandTotal = subtotal + vatAmt

  async function resolvePatientId(): Promise<number> {
    if (selectedPat) return selectedPat.id
    if (!vorname && !nachname) throw new Error('Please select or enter a patient.')
    const created = await api.createPatient({
      anrede,
      first_name: vorname || '—',
      last_name: nachname || '—',
      date_of_birth: dob || null,
      street,
      postal_code: postal,
      city,
      insurance_number: versNr,
      email: patEmail,
    })
    setSelectedPat(created)
    return created.id
  }

  async function submit(finalize: boolean) {
    setError('')
    setSaving(true)
    try {
      const patientId = await resolvePatientId()
      let created = await api.createInvoice({
        patient_id: patientId,
        diagnosis,
        issue_date: issueDate,
        due_date: dueDate,
        vat_rate: vatRate,
        notes,
        line_items: items
          .filter(i => i.desc || i.goaNr)
          .map(i => ({
            goae_number: i.goaNr,
            description: i.desc,
            service_date: i.serviceDate,
            quantity: i.qty,
            base_rate: i.baseRate,
            multiplier: i.multiplier,
            justification: i.justification,
            is_verlangen: i.verlangen,
          })),
        expenses: mats.filter(m => m.name).map(m => ({ description: m.name, amount: +m.amount || 0 })),
      })
      if (finalize) {
        await api.updateInvoiceStatus(created.id, 'sent')
        created = { ...created, status: 'sent' }
      }
      setSaved(created)
      setSendEmail(patEmail || selectedPat?.email || '')
      setSendDesc(`Invoice ${created.invoice_number} — ${created.total.toFixed(2)} € — due ${created.due_date || '—'}`)
      onSave(created)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save invoice.')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#F3F4F6', zIndex: 400, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: '#F8F8F8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '794px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setSaved(null)}
              style={{ height: '2rem', padding: '0 0.875rem', border: '1px solid var(--border)', background: '#fff', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              ← Back to edit
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Preview — {saved.status === 'sent' ? 'Finalized' : 'Draft'}</span>
            {saved.pdf_url !== '#' && (
              <a href={saved.pdf_url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: '#216A56', fontWeight: 600, textDecoration: 'none' }}>
                Download real PDF →
              </a>
            )}
          </div>
          <div style={{ width: '794px', minHeight: '1123px', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: '64px 72px', marginBottom: '1.5rem', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#216A56', marginBottom: '0.25rem' }}>InviAI</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#000000', fontWeight: 600 }}>{praxis.arztName}</div>
                  <div style={{ fontSize: '0.875rem', color: '#000000' }}>{praxis.fachgebiet}</div>
                  <div style={{ fontSize: '0.875rem', color: '#000000', marginTop: '0.25rem' }}>{praxis.adresse}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{saved.invoice_number}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Issue date: {saved.issue_date}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Due date: {saved.due_date || '—'}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '3rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Bill to</div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{saved.patient_name}</div>
                {versNr && <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Insurance No.: {versNr}</div>}
              </div>
              {saved.diagnosis && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Diagnosis</div>
                  <div style={{ fontSize: '0.8125rem' }}>{saved.diagnosis}</div>
                </div>
              )}
            </div>
            {saved.line_items.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['§ GOÄ', 'Description', 'Date', 'Qty', 'Factor', 'Amount'].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            textAlign: i === 2 || i === 3 || i === 4 ? 'center' : i === 5 ? 'right' : 'left',
                            padding: '0.5rem 0.375rem',
                            fontWeight: 600,
                            color: 'var(--muted-foreground)',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {saved.line_items.map((li, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : '#FAFAFA' }}>
                        <td style={{ padding: '0.625rem 0.375rem', fontFamily: 'var(--font-mono)' }}>{li.goae_number || '—'}</td>
                        <td style={{ padding: '0.625rem 0.375rem' }}>{li.description || '—'}</td>
                        <td style={{ padding: '0.625rem 0.375rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{li.service_date}</td>
                        <td style={{ padding: '0.625rem 0.375rem', textAlign: 'center' }}>{li.quantity}</td>
                        <td style={{ padding: '0.625rem 0.375rem', textAlign: 'center' }}>{li.multiplier}x</td>
                        <td style={{ padding: '0.625rem 0.375rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{li.amount.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {saved.expenses.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Expenses / Materials</div>
                {saved.expenses.map((exp, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '0.25rem 0' }}>
                    <span>{exp.description}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{exp.amount.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '260px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Services</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{saved.subtotal_services.toFixed(2)} €</span>
                </div>
                {saved.subtotal_expenses > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Expenses</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{saved.subtotal_expenses.toFixed(2)} €</span>
                  </div>
                )}
                {saved.vat_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>VAT {saved.vat_rate}%</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{saved.vat_amount.toFixed(2)} €</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <span>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#216A56' }}>{saved.total.toFixed(2)} €</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Payment reference</div>
                <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Tax No.: {praxis.steuernummer}</div>
                <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>IBAN: {praxis.iban}</div>
                <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>BIC: {praxis.bic}</div>
                <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem', fontWeight: 500 }}>Reference ID: {saved.invoice_number}</div>
                {saved.notes && <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{saved.notes}</div>}
              </div>
              {saved.payment_url !== '#' && (
                <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <img src={qrImage(saved.payment_url)} alt="Payment QR" style={{ display: 'block', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.375rem', fontWeight: 500 }}>Pay online</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <img src={qrImage(saved.chat_url)} alt="AI Chat QR" style={{ display: 'block', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.375rem', fontWeight: 500 }}>AI assistant</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ width: '20rem', flexShrink: 0, background: '#fff', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Send to client</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Email the invoice directly to the patient</div>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recipient email</label>
              <input
                value={sendEmail}
                onChange={e => setSendEmail(e.target.value)}
                placeholder="patient@email.com"
                style={{ width: '100%', height: '2.125rem', padding: '0 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', background: 'transparent', color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message</label>
              <textarea
                value={sendDesc}
                onChange={e => setSendDesc(e.target.value)}
                rows={5}
                style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', background: 'transparent', color: 'var(--foreground)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.5' }}
              />
            </div>
            {sendSent && <div style={{ padding: '0.625rem', background: '#DCFCE7', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#166534', fontWeight: 500 }}>✓ Sent successfully</div>}
          </div>
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => setSendSent(true)}
              style={{ height: '2.5rem', background: '#216A56', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 120ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#000')}
              onMouseLeave={e => (e.currentTarget.style.background = '#216A56')}
            >
              Send to Client
            </button>
            <button onClick={onClose} style={{ height: '2.5rem', background: '#fff', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F3F4F6', zIndex: 400, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: '#F8F8F8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', width: '880px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>New Invoice</h2>
          </div>
          <button onClick={onClose} style={{ width: '2rem', height: '2rem', border: 'none', background: '#FFFFFF', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
            ×
          </button>
        </div>

        {error && (
          <div style={{ width: '880px', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginBottom: '1rem', width: '880px' }}>
          <div style={{ ...sec, width: '400px', marginBottom: 0, display: 'flex', alignItems: 'stretch', flexDirection: 'column', gap: '40px', justifyContent: 'flex-start' }}>
            <div>
              <label style={lbl}>Invoice Number</label>
              <input value="Assigned on save" readOnly style={{ ...inp, color: 'var(--muted-foreground)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
              <div style={{ width: '100%' }}>
                <label style={lbl}>Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => {
                    setIssueDate(e.target.value)
                    setDueDate(addDays(e.target.value, 30))
                  }}
                  style={inp}
                />
              </div>
              <div style={{ width: '100%' }}>
                <label style={lbl}>Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-xl)', border: '1px solid #E5E5E5', padding: '1.5rem', marginBottom: 0, flex: 1, display: 'flex', gap: '20px', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: '16px' }}>{praxis.arztName}</div>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                    <div style={{ fontSize: '14px', color: '#141414' }}>{praxis.fachgebiet}</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#121212' }}>{praxis.email}</div>
                <div style={{ fontSize: '14px', color: '#121212' }}>{praxis.telefon}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '14px', color: '#333232', fontWeight: 600 }}>{praxis.praxisName}</div>
                <div style={{ fontSize: '14px' }}>{praxis.adresse}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={sec}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Patient</div>
            {selectedPat && (
              <button
                onClick={() => {
                  setSelectedPat(null)
                  setVorname('')
                  setNachname('')
                  setDob('')
                  setPatQ('')
                }}
                style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '7rem 1fr', marginBottom: '0.75rem', gap: '12px' }}>
            <div>
              <label style={lbl}>Title</label>
              <select value={anrede} onChange={e => setAnrede(e.target.value as Anrede)} style={{ ...inp, marginRight: '12px', paddingRight: '1rem', width: '100%' }}>
                {ANREDE_OPTS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ position: 'relative' }} ref={patPickRef}>
              <label style={lbl}>Name</label>
              <input
                value={newPatientMode ? (vorname + ' ' + nachname).trim() : selectedPat ? `${selectedPat.first_name} ${selectedPat.last_name}` : patQ}
                onChange={e => {
                  if (newPatientMode) {
                    const parts = e.target.value.split(' ')
                    setVorname(parts[0] || '')
                    setNachname(parts.slice(1).join(' ') || '')
                  } else {
                    setPatQ(e.target.value)
                    setSelectedPat(null)
                    setPatDropOpen(true)
                  }
                }}
                onFocus={() => {
                  if (!newPatientMode) setPatDropOpen(true)
                }}
                placeholder={newPatientMode ? 'Enter full name' : 'Search patient by name…'}
                autoComplete="off"
                style={{ ...inp, borderColor: selectedPat ? '#216A56' : newPatientMode ? '#216A56' : 'var(--border)', background: selectedPat || newPatientMode ? '#F0FBF8' : 'transparent' }}
              />
              {patDropOpen && !selectedPat && !newPatientMode && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', zIndex: 30, maxHeight: '16rem', overflowY: 'auto' }}>
                  {patients
                    .filter(p => !patQ || `${p.first_name} ${p.last_name}`.toLowerCase().includes(patQ.toLowerCase()))
                    .map(p => (
                      <div
                        key={p.id}
                        onClick={() => selectPatient(p)}
                        style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {p.first_name} {p.last_name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{p.date_of_birth}</span>
                      </div>
                    ))}
                  {patQ && patients.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patQ.toLowerCase())).length === 0 && (
                    <div
                      onClick={() => {
                        setNewPatientMode(true)
                        setVorname(patQ.split(' ')[0] || '')
                        setNachname(patQ.split(' ').slice(1).join(' ') || '')
                        setPatDropOpen(false)
                      }}
                      style={{ padding: '0.625rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#216A56', fontSize: '0.875rem', borderTop: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F0FBF8')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Add "{patQ}" as new patient
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={lbl}>Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Insurance Number (opt.)</label>
              <input value={versNr} onChange={e => setVersNr(e.target.value)} placeholder="A123456789" style={inp} />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input value={patEmail} onChange={e => setPatEmail(e.target.value)} placeholder="john@example.com" style={inp} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={lbl}>Street &amp; House No.</label>
              <input value={street} onChange={e => setStreet(e.target.value)} placeholder="Musterstraße 12" style={inp} />
            </div>
            <div>
              <label style={lbl}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Berlin" style={inp} />
            </div>
            <div>
              <label style={lbl}>Postal Code</label>
              <input value={postal} onChange={e => setPostal(e.target.value)} placeholder="10115" style={inp} />
            </div>
          </div>
        </div>

        <div style={sec}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Diagnosis / Reason for visit</div>
          <div>
            <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. J06.9 Acute upper respiratory infection" style={{ ...inp, height: '4rem' }} />
          </div>
        </div>

        <div style={sec}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '1rem' }}>Procedures (GOÄ)</div>
          {items.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '0.625rem', position: 'relative' }}>
              <button onClick={() => removeItem(item.id)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: '1rem', lineHeight: 1 }}>
                ×
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '14rem 1fr', gap: '0.75rem', marginBottom: '0.625rem' }}>
                <div style={{ position: 'relative' }}>
                  <label style={lbl}>GOÄ No.</label>
                  <input
                    value={goaQ[item.id] || ''}
                    onChange={e => {
                      setGoaQ(q => ({ ...q, [item.id]: e.target.value }))
                      setShowGoaDrop(s => ({ ...s, [item.id]: true }))
                    }}
                    onFocus={() => setShowGoaDrop(s => ({ ...s, [item.id]: true }))}
                    placeholder="No. or description…"
                    style={inp}
                  />
                  {showGoaDrop[item.id] && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 20, maxHeight: '12rem', overflowY: 'auto' }}>
                      {procedures
                        .filter(g => !goaQ[item.id] || g.goae_number.includes(goaQ[item.id] || '') || g.description.toLowerCase().includes((goaQ[item.id] || '').toLowerCase()))
                        .map(g => (
                          <div
                            key={g.id}
                            onClick={() => selectGoa(item.id, g)}
                            style={{ padding: '0.4rem 0.625rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span>
                              <b>{g.goae_number}</b> – {g.description}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>{g.base_rate.toFixed(2)} €</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={lbl}>Service Date</label>
                  <input type="date" value={item.serviceDate} onChange={e => updateItem(item.id, 'serviceDate', e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 5rem 7rem auto', gap: '0.625rem', alignItems: 'end', marginBottom: item.multiplier > 2.3 ? '0.625rem' : '0' }}>
                <div>
                  <label style={lbl}>Description</label>
                  <input value={item.desc} onChange={e => updateItem(item.id, 'desc', e.target.value)} placeholder="Beschreibung" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Quantity</label>
                  <input type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', +e.target.value || 1)} style={{ ...inp, textAlign: 'right' }} />
                </div>
                <div>
                  <label style={lbl}>Multiplier</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={item.multiplier}
                      onChange={e => updateItem(item.id, 'multiplier', +e.target.value || 2.3)}
                      style={{ ...inp, textAlign: 'right', borderColor: item.multiplier > 2.3 ? '#EAB308' : 'var(--border)' }}
                    />
                    {item.multiplier > 2.3 && <span style={{ fontSize: '0.65rem', color: '#EAB308', whiteSpace: 'nowrap' }}>→ Justif.</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label style={lbl}>Amount</label>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9375rem', height: '2.125rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {(item.baseRate * item.multiplier * item.qty).toFixed(2)} €
                  </div>
                </div>
              </div>
              {item.multiplier > 2.3 && (
                <div style={{ marginBottom: '0.375rem' }}>
                  <label style={{ ...lbl, color: '#EAB308' }}>Begründung (Pflichtfeld bei Multiplier &gt; 2,3)</label>
                  <input value={item.justification} onChange={e => updateItem(item.id, 'justification', e.target.value)} placeholder="Please justify the deviation…" style={{ ...inp, borderColor: '#EAB308' }} />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.375rem', color: 'var(--muted-foreground)' }}>
                <input type="checkbox" checked={item.verlangen} onChange={e => updateItem(item.id, 'verlangen', e.target.checked)} style={{ accentColor: '#216A56' }} />
                Patient-requested service (Verlangensleistung)
              </label>
            </div>
          ))}
          <button
            onClick={addItem}
            style={{ width: '100%', height: '2.125rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Add GOÄ procedure
          </button>
        </div>

        <div style={sec}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '1rem' }}>
            Expenses / Materials <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>(optional)</span>
          </div>
          {mats.map(m => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 8rem auto', gap: '0.625rem', alignItems: 'end', marginBottom: '0.5rem' }}>
              <div>
                <label style={lbl}>Description</label>
                <input value={m.name} onChange={e => updateMat(m.id, 'name', e.target.value)} placeholder="e.g. bandaging material" style={inp} />
              </div>
              <div>
                <label style={lbl}>
                  Amount (€){+m.amount > 25.56 ? <span style={{ color: '#EAB308' }}> ⚠ Receipt req.</span> : null}
                </label>
                <input type="number" step="0.01" value={m.amount} onChange={e => updateMat(m.id, 'amount', e.target.value)} style={{ ...inp, textAlign: 'right', borderColor: +m.amount > 25.56 ? '#EAB308' : 'var(--border)' }} />
              </div>
              <button onClick={() => removeMat(m.id)} style={{ height: '2.125rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: '1.1rem' }}>
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addMat}
            style={{ width: '100%', height: '2.125rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Add expense
          </button>
        </div>

        <div style={sec}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '1rem' }}>Notes &amp; Remarks</div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={lbl}>Free text / Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Individual notes for this invoice…"
              style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', background: 'transparent', color: 'var(--foreground)' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={lbl}>Payment instructions</label>
            <textarea
              value={zahlungshinweis}
              onChange={e => setZahlungshinweis(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', background: 'transparent', color: 'var(--foreground)' }}
            />
          </div>
          <div>
            <label style={lbl}>Late payment notice</label>
            <textarea
              value={mahnhinweis}
              onChange={e => setMahnhinweis(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', background: 'transparent', color: 'var(--foreground)' }}
            />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', padding: '2rem', display: 'flex', gap: '20px', flexDirection: 'column', marginBottom: '1rem', width: '880px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Payment reference</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '32px' }}>
                <div style={{ fontSize: '14px' }}>Tax No.: {praxis.steuernummer}</div>
                <div style={{ fontSize: '14px' }}>IBAN: {praxis.iban}</div>
                <div style={{ fontSize: '14px' }}>BIC: {praxis.bic}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: '20rem', flexShrink: 0, background: '#fff', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex' }}>
          <div style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.5rem', width: '100%' }}>
            <span style={{ width: '100%', display: 'inline-block' }}>Invoice</span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.175rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: '#FEF9C3', color: '#854D0E' }}>
            <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: '#CA8A04', flexShrink: 0 }} /> Draft
          </span>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Services</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{serviceTotal.toFixed(2)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Expenses</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{matTotal.toFixed(2)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ color: 'var(--muted-foreground)' }}>VAT</span>
              <select
                value={vatRate}
                onChange={e => setVatRate(+e.target.value)}
                style={{ fontSize: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.125rem 0.25rem', fontFamily: 'var(--font-sans)', background: 'transparent', cursor: 'pointer' }}
              >
                <option value={0}>0% (medical treatment)</option>
                <option value={19}>19% (other)</option>
              </select>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{vatAmt.toFixed(2)} €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.625rem' }}>
            <span>Total</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#216A56' }}>{grandTotal.toFixed(2)} €</span>
          </div>
        </div>

        {(vorname || nachname) && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontSize: '0.8125rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Patient</div>
            <div style={{ fontWeight: 500 }}>
              {ANREDE_OPTS.find(o => o.value === anrede)?.label} {vorname} {nachname}
            </div>
            {dob && <div style={{ color: 'var(--muted-foreground)' }}>DOB {dob}</div>}
            {(street || city) && <div style={{ color: 'var(--muted-foreground)' }}>{[street, [postal, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</div>}
          </div>
        )}

        {items.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Services</div>
            {items.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem', gap: '0.5rem' }}>
                <span style={{ color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {i.goaNr ? '§' + i.goaNr + ' ' : ''}
                  {i.desc || '—'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{(i.baseRate * i.multiplier * i.qty).toFixed(2)} €</span>
              </div>
            ))}
            {items.some(i => i.multiplier > 2.3 && !i.justification) && (
              <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.5rem', background: '#FEF9C3', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: '#854D0E' }}>
                ⚠ Begründung für erhöhten Multiplier fehlt
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '1.25rem 1.5rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)' }}>
          <button
            disabled={saving}
            onClick={() => submit(true)}
            style={{ height: '2.5rem', background: '#216A56', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 120ms', opacity: saving ? 0.7 : 1 }}
            onMouseEnter={e => !saving && (e.currentTarget.style.background = '#000')}
            onMouseLeave={e => !saving && (e.currentTarget.style.background = '#216A56')}
          >
            {saving ? 'Saving…' : 'Finalize Invoice'}
          </button>
          <button
            disabled={saving}
            onClick={() => submit(false)}
            style={{ height: '2.5rem', background: '#fff', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: '0.875rem', cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}
          >
            Save as Draft
          </button>
          <button onClick={onClose} style={{ marginTop: '0.25rem', border: 'none', background: 'none', color: 'var(--destructive)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
