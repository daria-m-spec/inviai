import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from '../../app/icons'
import { filterBtnBase } from './atoms'

interface MultiSelectProps<T extends string | { name: string }> {
  label: string
  options: T[]
  value: string[]
  onChange: (value: string[]) => void
  renderOption?: (option: T) => ReactNode
}

const LABEL_MAP: Record<string, string> = { 'All patients': 'Patients', 'All procedures': 'Procedures', 'All statuses': 'Statuses' }

export function MultiSelect<T extends string | { name: string }>({ label, options, value, onChange, renderOption }: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const allKeys = options.map(o => (typeof o === 'string' ? o : o.name))
  const filtered = options.filter(o => {
    const t = typeof o === 'string' ? o : o.name
    return t.toLowerCase().includes(q.toLowerCase())
  })
  const isAllSelected = value.length === 0
  const displayLabel = isAllSelected ? label : LABEL_MAP[label] || label.replace(/^All /, '')
  const isSelected = (v: string) => isAllSelected || value.includes(v)
  const toggle = (v: string) => {
    if (isAllSelected) {
      onChange(allKeys.filter(k => k !== v))
    } else {
      const next = value.includes(v) ? value.filter(x => x !== v) : [...value, v]
      onChange(next.length === allKeys.length ? [] : next)
    }
  }
  const count = value.length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={filterBtnBase(count > 0)}>
        {displayLabel}
        {count > 0 && (
          <span style={{ background: 'rgba(255,255,255,0.25)', color: 'inherit', borderRadius: '9999px', fontSize: '0.7rem', padding: '0 0.375rem', fontWeight: 600, minWidth: '1.25rem', textAlign: 'center' }}>
            {count}
          </span>
        )}
        <ChevronDown size={13} style={{ opacity: 0.6, marginLeft: count > 0 ? 0 : 'auto' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '14rem',
            maxHeight: '18rem',
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0.5rem 0.5rem 0' }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%',
                height: '2rem',
                padding: '0 0.625rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-sans)',
                background: 'transparent',
                color: 'var(--foreground)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0.25rem' }}>
            {filtered.length === 0 && <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>No results</div>}
            {filtered.map(o => {
              const v = typeof o === 'string' ? o : o.name
              const sel = isSelected(v)
              return (
                <div
                  key={v}
                  onClick={() => toggle(v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.4375rem 0.625rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: sel ? 'var(--accent)' : 'transparent' }}
                  onMouseEnter={e => {
                    if (!sel) e.currentTarget.style.background = 'var(--muted)'
                  }}
                  onMouseLeave={e => {
                    if (!sel) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: '1px solid',
                      borderColor: sel ? '#216A56' : 'var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: sel ? '#216A56' : 'transparent',
                      display: 'inline-grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      transition: 'all 100ms',
                    }}
                  >
                    {sel && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {renderOption ? renderOption(o) : <span style={{ fontSize: '0.875rem' }}>{v}</span>}
                </div>
              )
            })}
          </div>
          <div style={{ padding: '0.375rem 0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => {
                onChange([])
                setQ('')
              }}
              style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {isAllSelected ? 'Deselect all' : 'Reset all'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
