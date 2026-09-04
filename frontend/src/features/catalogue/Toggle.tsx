export function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div
      onClick={e => {
        e.stopPropagation()
        onChange(!checked)
      }}
      style={{ width: '36px', height: '20px', borderRadius: '10px', background: checked ? '#216A56' : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 150ms', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: '2px', left: checked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 150ms' }} />
    </div>
  )
}
