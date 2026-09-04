import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from '../../app/Sidebar'
import { MultiSelect } from './MultiSelect'
import { NewInvoiceModal } from './NewInvoiceModal'
import { InvoiceDetail } from './InvoiceDetail'
import { StatusBadge, filterBtnBase } from './atoms'
import { DownloadIcon, SearchIcon } from '../../app/icons'
import { fmtDate, STATUS_LABEL } from '../../data/inviai'
import { api } from '../../api/client'
import type { ApiInvoice, ApiInvoiceStatus } from '../../api/types'

const ALL_STATUSES: ApiInvoiceStatus[] = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']

export function InvoicesPage() {
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [invoices, setInvoices] = useState<ApiInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [q, setQ] = useState('')
  const [fPatient, setFPatient] = useState<string[]>([])
  const [fProc, setFProc] = useState<string[]>([])
  const [fStatus, setFStatus] = useState<string[]>([])
  const [fDate, setFDate] = useState({ from: '', to: '' })
  const [modalInv, setModalInv] = useState<ApiInvoice | null>(null)
  const [visible, setVisible] = useState(25)
  const sentinelRef = useRef<HTMLTableRowElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  function refresh() {
    setLoading(true)
    setLoadError('')
    api
      .listInvoices()
      .then(setInvoices)
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load invoices.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  const patientOptions = useMemo(() => Array.from(new Set(invoices.map(inv => inv.patient_name))).sort(), [invoices])
  const procedureOptions = useMemo(() => {
    const set = new Set<string>()
    invoices.forEach(inv => inv.line_items.forEach(li => li.description && set.add(li.description)))
    return Array.from(set).sort()
  }, [invoices])

  const filtered = useMemo(
    () =>
      invoices.filter(inv => {
        if (q) {
          const s = q.toLowerCase()
          if (![inv.invoice_number, inv.patient_name, ...inv.line_items.map(li => li.description)].join(' ').toLowerCase().includes(s)) return false
        }
        if (fPatient.length && !fPatient.includes(inv.patient_name)) return false
        if (fProc.length && !inv.line_items.some(li => fProc.includes(li.description))) return false
        if (fStatus.length && !fStatus.includes(inv.status)) return false
        if (fDate.from && inv.issue_date < fDate.from) return false
        if (fDate.to && inv.issue_date > fDate.to) return false
        return true
      }),
    [invoices, q, fPatient, fProc, fStatus, fDate]
  )

  useEffect(() => {
    setVisible(25)
    setModalInv(null)
  }, [q, fPatient, fProc, fStatus, fDate])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visible < filtered.length) setVisible(v => Math.min(v + 20, filtered.length + 1))
      },
      { root: scrollRef.current, threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible, filtered.length])

  const rows = filtered.slice(0, visible)
  const anyFilter = fPatient.length || fProc.length || fStatus.length || q || fDate.from || fDate.to

  const th = { padding: '0.625rem 1rem', textAlign: 'left' as const, fontWeight: 500, fontSize: '0.75rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' as const, borderBottom: '1px solid var(--border)', userSelect: 'none' as const }

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.5rem 1.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Invoices</h1>
              <button
                onClick={() => setShowNewInvoice(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', height: '2.25rem', padding: '0 1rem', background: '#216A56', color: '#FFFFFF', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'background 120ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#000')}
                onMouseLeave={e => (e.currentTarget.style.background = '#216A56')}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> New invoice
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', gap: '0.5rem', marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none', display: 'flex' }}>
                    <SearchIcon />
                  </span>
                  <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Search by name, procedure or invoice #"
                    style={{ width: '280px', height: '2.25rem', padding: '0 0.75rem 0 2.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', background: 'transparent', color: 'var(--foreground)', outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--ring)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', height: '2.25rem', padding: '0 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', fontSize: '0.8125rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>From</span>
                  <input type="date" value={fDate.from} onChange={e => setFDate(d => ({ ...d, from: e.target.value }))} style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', color: 'var(--foreground)', outline: 'none', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, marginLeft: '0.25rem' }}>To</span>
                  <input type="date" value={fDate.to} onChange={e => setFDate(d => ({ ...d, to: e.target.value }))} style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', color: 'var(--foreground)', outline: 'none', cursor: 'pointer' }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#757575', whiteSpace: 'nowrap', paddingLeft: '0.5rem', fontWeight: 600 }}>
                  {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
                  {anyFilter ? ' · filtered' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <MultiSelect label="All patients" options={patientOptions} value={fPatient} onChange={setFPatient} />
                <MultiSelect label="All procedures" options={procedureOptions} value={fProc} onChange={setFProc} />
                <MultiSelect label="All statuses" options={ALL_STATUSES.map(s => STATUS_LABEL[s])} value={fStatus.map(s => STATUS_LABEL[s as ApiInvoiceStatus] || s)} onChange={labels => setFStatus(labels.map(l => (Object.keys(STATUS_LABEL) as ApiInvoiceStatus[]).find(k => STATUS_LABEL[k] === l) || l))} />
                {!!anyFilter && (
                  <button
                    onClick={() => {
                      setQ('')
                      setFPatient([])
                      setFProc([])
                      setFStatus([])
                      setFDate({ from: '', to: '' })
                    }}
                    style={{ ...filterBtnBase(false), color: 'var(--muted-foreground)', fontSize: '0.8125rem', border: 'none', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {loadError && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Couldn't reach the InviAI API — is the backend running? ({loadError})</span>
                <button onClick={refresh} style={{ border: 'none', background: 'none', color: '#991B1B', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Retry
                </button>
              </div>
            )}

            <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th style={th}>Patient</th>
                    <th style={{ ...th, width: '8rem' }}>Visit Date</th>
                    <th style={{ ...th, width: '7rem', textAlign: 'right' }}>Total</th>
                    <th style={{ ...th, width: '10rem' }}>Invoice #</th>
                    <th style={{ ...th, width: '7rem' }}>Status</th>
                    <th style={{ ...th, width: '5.5rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(inv => (
                    <tr
                      key={inv.id}
                      onClick={() => setModalInv(inv)}
                      style={{ cursor: 'pointer', background: 'transparent', transition: 'background 80ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.75rem 0.625rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 500 }}>{inv.patient_name}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.625rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{fmtDate(inv.issue_date)}</td>
                      <td style={{ padding: '0.75rem 0.625rem', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontWeight: 500, textAlign: 'right' }}>{inv.total.toFixed(2)} €</td>
                      <td style={{ padding: '0.75rem 0.625rem', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '0.75rem 0.625rem', borderBottom: '1px solid var(--border)' }}>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td style={{ padding: '0.75rem 0.625rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.625rem', height: '1.875rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--foreground)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, whiteSpace: 'nowrap', transition: 'background 100ms', textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <DownloadIcon /> PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                  <tr ref={sentinelRef}>
                    <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                      {loading
                        ? 'Loading invoices…'
                        : visible >= filtered.length
                          ? filtered.length === 0
                            ? 'No invoices match your filters.'
                            : `All ${filtered.length} invoices loaded`
                          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>Loading more…</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {modalInv && (
        <div onClick={() => setModalInv(null)} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0/50%)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-2xl)', width: '100%', maxWidth: '52rem', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
            <button
              onClick={() => setModalInv(null)}
              style={{ position: 'sticky', top: '1rem', float: 'right', margin: '1rem 1rem 0 0', width: '1.75rem', height: '1.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}
            >
              ✕
            </button>
            <InvoiceDetail invoice={modalInv} />
          </div>
        </div>
      )}
      {showNewInvoice && (
        <NewInvoiceModal
          onClose={() => setShowNewInvoice(false)}
          onSave={inv => {
            setInvoices(prev => [inv, ...prev])
          }}
        />
      )}
    </>
  )
}
