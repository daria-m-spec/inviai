import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from './icons'

export function HeaderDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.51rem 0.8rem',
          border: '1px solid #E0DFDEEB',
          borderRadius: 'var(--radius-md)',
          background: '#DDF8F1',
          color: '#151515',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'background 100ms',
          width: '100%',
          height: '72px',
          justifyContent: 'flex-start',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = '#DDF8F1')}
      >
        <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#216A56', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
          SM
        </span>
        <div style={{ textAlign: 'left', width: '100%' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.3, color: '#565555', width: '100%' }}>
            <span style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, color: '#000000' }}>Dr. Sarah Mitchell</span>
            </span>
          </div>
        </div>
        <ChevronDown size={18} style={{ opacity: 0.5, marginLeft: '0.125rem' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            minWidth: '12rem',
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 200,
            padding: '0.25rem',
            width: '100%',
          }}
        >
          {[{ label: 'Account details', danger: false }, { label: 'Log out', danger: true }].map(item => (
            <button
              key={item.label}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: 'none',
                background: 'transparent',
                color: item.danger ? 'var(--destructive)' : 'var(--foreground)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
