import { StatusBadge } from './atoms'
import { DownloadIcon } from '../../app/icons'
import { fmtDate } from '../../data/inviai'
import type { ApiInvoice } from '../../api/types'

export function InvoiceDetail({ invoice }: { invoice: ApiInvoice }) {
  const cell = { padding: '0.4rem 0.625rem', fontSize: '0.8125rem' }
  const rows: [string, string | null][] = [
    ['Patient', invoice.patient_name],
    ['Doctor', invoice.doctor_name],
    ['Visit Date', fmtDate(invoice.issue_date)],
    ['Status', null],
    ['Diagnosis', invoice.diagnosis || '—'],
  ]

  return (
    <div style={{ background: 'var(--card)', borderTop: '2px solid #216A56', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Invoice</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.875rem', color: 'var(--foreground)' }}>{invoice.invoice_number}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3125rem' }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--muted-foreground)', minWidth: '7rem', flexShrink: 0 }}>{k}</span>
                {k === 'Status' ? <StatusBadge status={invoice.status} /> : <span style={{ fontWeight: k === 'Patient' ? 500 : 400 }}>{v}</span>}
              </div>
            ))}
          </div>
          {invoice.notes && (
            <div style={{ marginTop: '1rem', padding: '0.625rem 0.75rem', background: 'var(--muted)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>Notes: </span>
              {invoice.notes}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Line Items</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['GOÄ', 'Description', 'Date', 'Amount'].map((h, i) => (
                  <th key={h} style={{ ...cell, textAlign: i === 3 ? 'right' : 'left', fontWeight: 500, color: 'var(--muted-foreground)', paddingBottom: '0.5rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((li, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)' }}>{li.goae_number}</td>
                  <td style={{ ...cell, color: 'var(--muted-foreground)' }}>{li.description}</td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{fmtDate(li.service_date)}</td>
                  <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{li.amount.toFixed(2)} €</td>
                </tr>
              ))}
              {invoice.expenses.map((exp, i) => (
                <tr key={`exp-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>—</td>
                  <td style={{ ...cell, color: 'var(--muted-foreground)' }}>{exp.description}</td>
                  <td style={cell} />
                  <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{exp.amount.toFixed(2)} €</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ ...cell, paddingTop: '0.625rem', fontWeight: 600 }}>
                  Total
                </td>
                <td style={{ ...cell, paddingTop: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem' }}>{invoice.total.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            {invoice.chat_url !== '#' && (
              <a
                href={invoice.chat_url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', height: '2.25rem', padding: '0 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}
              >
                Open patient chat
              </a>
            )}
            {invoice.pdf_url === '#' ? (
              <span
                title="Not available in demo mode — no backend connected"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', height: '2.25rem', padding: '0 1rem', background: 'var(--muted)', color: 'var(--muted-foreground)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'var(--font-sans)' }}
              >
                <DownloadIcon /> Download PDF
              </span>
            ) : (
            <a
              href={invoice.pdf_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                height: '2.25rem',
                padding: '0 1rem',
                background: '#216A56',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                textDecoration: 'none',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#000')}
              onMouseLeave={e => (e.currentTarget.style.background = '#216A56')}
            >
              <DownloadIcon /> Download PDF
            </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
