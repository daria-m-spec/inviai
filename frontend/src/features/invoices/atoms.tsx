import type { CSSProperties } from 'react'
import type { ApiInvoiceStatus } from '../../api/types'
import { STATUS_LABEL, STATUS_STYLE } from '../../data/inviai'

export function StatusBadge({ status }: { status: ApiInvoiceStatus }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.2rem 0.625rem',
        borderRadius: '8px',
        fontSize: '0.7375rem',
        fontWeight: 500,
        background: s.bg,
        color: s.text,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export const filterBtnBase = (active: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  height: '2.25rem',
  padding: '0 0.75rem',
  cursor: 'pointer',
  border: '1px solid',
  borderColor: active ? '#216A56' : 'var(--border)',
  borderRadius: 'var(--radius-md)',
  background: active ? '#216A56' : 'var(--background)',
  color: active ? '#fff' : 'var(--foreground)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  outline: 'none',
  transition: 'background 100ms,color 100ms,border-color 100ms',
})
