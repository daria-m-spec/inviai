import type { ApiInvoice } from '../../api/types'
import { StatusBadge } from './atoms'
import { DownloadIcon } from '../../app/icons'

interface InvoicePreviewProps {
  invoice: ApiInvoice
  onClose: () => void
}

/** The "generated invoice" view — embeds the real generated PDF (same file
 * the PDF button downloads) so patient data and page breaks always match
 * the actual document exactly, instead of maintaining a separate HTML
 * replica that can drift out of sync with it. */
export function InvoicePreview({ invoice, onClose }: InvoicePreviewProps) {
  const hasPdf = invoice.pdf_url !== '#'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F3F4F6', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onClose}
          style={{ height: '2rem', padding: '0 0.875rem', border: '1px solid var(--border)', background: '#fff', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
        >
          ← Close
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.875rem' }}>{invoice.invoice_number}</span>
        <StatusBadge status={invoice.status} />
        {hasPdf && (
          <a
            href={invoice.pdf_url}
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#216A56', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            <DownloadIcon /> Open in new tab
          </a>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, background: '#525659' }}>
        {hasPdf ? (
          <iframe title={`Invoice ${invoice.invoice_number}`} src={invoice.pdf_url} style={{ width: '100%', height: '100%', border: 'none' }} />
        ) : (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--muted-foreground)', background: '#fff', height: '100%' }}>
            PDF not available in demo mode — no backend connected.
          </div>
        )}
      </div>
    </div>
  )
}
