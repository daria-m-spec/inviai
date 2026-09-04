import { NavLink } from 'react-router-dom'
import { IconBriefcaseMedical, IconFile, InviaiLogoMark } from './icons'
import { HeaderDropdown } from './HeaderDropdown'

const NAV_ITEMS = [
  { label: 'Invoices', to: '/invoices', icon: IconFile },
  { label: 'Catalogue', to: '/catalogue', icon: IconBriefcaseMedical },
]

export function Sidebar() {
  return (
    <aside
      style={{
        width: '15rem',
        flexShrink: 0,
        background: '#FFFFFF',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRadius: '12px',
      }}
    >
      <div style={{ padding: '1.125rem 1rem', borderBottom: '1px solid var(--sidebar-border)', background: '#216A56', width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <InviaiLogoMark />
          <span style={{ fontWeight: 600, fontSize: '18px', color: '#FFFFFF', letterSpacing: '-0.01em' }}>InviAI</span>
        </div>
      </div>
      <nav style={{ padding: '0.625rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '20px' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.label}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.5rem 0.625rem',
              borderRadius: 'var(--radius-md)',
              background: isActive ? '#DDF8F1' : 'transparent',
              color: isActive ? '#041410' : '#000000',
              fontSize: '0.875rem',
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              width: '100%',
              textAlign: 'left',
              height: '40px',
              textDecoration: 'none',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--muted)'
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent'
            }}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '0.75rem 0.5rem', width: '100%' }}>
        <HeaderDropdown />
      </div>
    </aside>
  )
}
