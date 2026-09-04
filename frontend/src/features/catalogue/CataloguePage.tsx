import { useMemo, useState } from 'react'
import { Sidebar } from '../../app/Sidebar'
import { Toggle } from './Toggle'
import { SearchIcon } from '../../app/icons'
import { CAT_PROCEDURES, CAT_TYPES, type CatalogueProcedure } from '../../data/inviai'

export function CataloguePage() {
  const [q, setQ] = useState('')
  const [activeType, setActiveType] = useState('All procedures')
  const [procs, setProcs] = useState<CatalogueProcedure[]>(CAT_PROCEDURES)

  const toggleAvail = (id: number) => setProcs(p => p.map(x => (x.id === id ? { ...x, available: !x.available } : x)))

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    CAT_TYPES.forEach(t => {
      c[t] = t === 'All procedures' ? procs.length : procs.filter(p => p.type === t).length
    })
    return c
  }, [procs])

  const filtered = useMemo(() => {
    let list = activeType === 'All procedures' ? procs : procs.filter(p => p.type === activeType)
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase()))
    return list
  }, [procs, activeType, q])

  const th = { padding: '0.625rem 1rem', textAlign: 'left' as const, fontWeight: 500, fontSize: '0.75rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' as const, borderBottom: '1px solid var(--border)', userSelect: 'none' as const }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.5rem 1.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Catalogue</h1>
            <button
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', height: '2.25rem', padding: '0 1rem', background: '#216A56', color: '#FFFFFF', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', transition: 'background 120ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#000')}
              onMouseLeave={e => (e.currentTarget.style.background = '#216A56')}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> New procedure
            </button>
          </div>

          <div style={{ marginBottom: '1rem', position: 'relative', maxWidth: '360px' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none', display: 'flex' }}>
              <SearchIcon />
            </span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name or code"
              style={{ width: '100%', height: '2.25rem', padding: '0 0.75rem 0 2.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', background: 'transparent', color: 'var(--foreground)', outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#216A56')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div style={{ flex: 1, display: 'flex', gap: '1rem', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ width: '18rem', flexShrink: 0, overflowY: 'auto', border: '1px solid #E5E5E5', padding: '16px', borderRadius: '12px', alignSelf: 'stretch', height: '400px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: '0.25rem', paddingBottom: '12px' }}>Types</div>
              {CAT_TYPES.map(type => {
                const isActive = activeType === type
                return (
                  <div
                    key={type}
                    onClick={() => setActiveType(type)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4375rem 0.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: isActive ? '#DDF8F1' : 'transparent', marginBottom: '2px' }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = 'var(--muted)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: isActive ? 500 : 400, color: isActive ? '#041410' : 'var(--foreground)' }}>{type}</span>
                    <span style={{ fontSize: '0.7rem', background: '#216A56', color: '#FFFFFF', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, padding: '0.175rem 0.4rem', lineHeight: 1 }}>{counts[type]}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', maxHeight: '100%', minWidth: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={th}>Name</th>
                    <th style={{ ...th, width: '8rem', textAlign: 'right' }}>Price / unit</th>
                    <th style={{ ...th, width: '6rem' }}>Unit</th>
                    <th style={{ ...th, width: '7rem' }}>Code</th>
                    <th style={{ ...th, width: '7rem', textAlign: 'center' }}>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                        No procedures found
                      </td>
                    </tr>
                  )}
                  {filtered.map(proc => (
                    <tr key={proc.id} style={{ background: 'transparent', transition: 'background 80ms' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{proc.name}</td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 500 }}>${proc.price.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>{proc.unit}</td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{proc.code}</td>
                      <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Toggle checked={proc.available} onChange={() => toggleAvail(proc.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
