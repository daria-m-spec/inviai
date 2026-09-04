import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ApiInvoice, ApiPractice } from '../../api/types'
import { DEFAULT_PRAXIS } from '../../data/inviai'
import { StatusBadge } from './atoms'
import { DownloadIcon } from '../../app/icons'

function qrImage(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=216A56&data=${encodeURIComponent(url)}`
}

interface InvoicePreviewProps {
  invoice: ApiInvoice
  onClose: () => void
}

/** Read-only "generated invoice" view — the same A4-style layout shown right
 * after an invoice is created, reused here so clicking a non-draft row shows
 * the actual generated document rather than a plain summary table. */
export function InvoicePreview({ invoice, onClose }: InvoicePreviewProps) {
  const [practice, setPractice] = useState<ApiPractice | null>(null)

  useEffect(() => {
    api.getPractice().then(setPractice).catch(() => {})
  }, [])

  const praxis = practice
    ? {
        arztName: `${practice.doctor_title} ${practice.doctor_first_name} ${practice.doctor_last_name}`.trim(),
        fachgebiet: practice.specialization,
        adresse: `${practice.street}, ${practice.postal_code} ${practice.city}`.trim(),
        steuernummer: practice.steuernummer,
        iban: practice.iban,
        bic: practice.bic,
      }
    : {
        arztName: `${DEFAULT_PRAXIS.doctor_title} ${DEFAULT_PRAXIS.doctor_first_name} ${DEFAULT_PRAXIS.doctor_last_name}`.trim(),
        fachgebiet: DEFAULT_PRAXIS.specialization,
        adresse: `${DEFAULT_PRAXIS.street}, ${DEFAULT_PRAXIS.postal_code} ${DEFAULT_PRAXIS.city}`,
        steuernummer: DEFAULT_PRAXIS.steuernummer,
        iban: DEFAULT_PRAXIS.iban,
        bic: DEFAULT_PRAXIS.bic,
      }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F3F4F6', zIndex: 400, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '794px', maxWidth: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{ height: '2rem', padding: '0 0.875rem', border: '1px solid var(--border)', background: '#fff', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            ← Close
          </button>
          <StatusBadge status={invoice.status} />
          {invoice.pdf_url !== '#' && (
            <a href={invoice.pdf_url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#216A56', fontWeight: 600, textDecoration: 'none' }}>
              <DownloadIcon /> Download PDF
            </a>
          )}
        </div>
        <div style={{ width: '794px', maxWidth: '100%', minHeight: '1123px', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: '64px 72px', boxSizing: 'border-box' }}>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{invoice.invoice_number}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Issue date: {invoice.issue_date}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Due date: {invoice.due_date || '—'}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '3rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Bill to</div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{invoice.patient_name}</div>
            </div>
            {invoice.diagnosis && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Diagnosis</div>
                <div style={{ fontSize: '0.8125rem' }}>{invoice.diagnosis}</div>
              </div>
            )}
          </div>
          {invoice.line_items.length > 0 && (
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
                  {invoice.line_items.map((li, idx) => (
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
          {invoice.expenses.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Expenses / Materials</div>
              {invoice.expenses.map((exp, i) => (
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
                <span style={{ fontFamily: 'var(--font-mono)' }}>{invoice.subtotal_services.toFixed(2)} €</span>
              </div>
              {invoice.subtotal_expenses > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Expenses</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{invoice.subtotal_expenses.toFixed(2)} €</span>
                </div>
              )}
              {invoice.vat_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>VAT {invoice.vat_rate}%</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{invoice.vat_amount.toFixed(2)} €</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                <span>Total</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#216A56' }}>{invoice.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Payment reference</div>
              <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Tax No.: {praxis.steuernummer}</div>
              <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>IBAN: {praxis.iban}</div>
              <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>BIC: {praxis.bic}</div>
              <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem', fontWeight: 500 }}>Reference ID: {invoice.invoice_number}</div>
              {invoice.notes && <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{invoice.notes}</div>}
            </div>
            {invoice.payment_url !== '#' && (
              <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <img src={qrImage(invoice.payment_url)} alt="Payment QR" style={{ display: 'block', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.375rem', fontWeight: 500 }}>Pay online</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <img src={qrImage(invoice.chat_url)} alt="AI Chat QR" style={{ display: 'block', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.375rem', fontWeight: 500 }}>AI assistant</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
