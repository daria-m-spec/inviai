import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
  style?: CSSProperties
}

export function IconFile({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  )
}

export function IconBriefcaseMedical({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 11v4" />
      <path d="M14 13h-4" />
      <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  )
}

export function ChevronDown({ size = 14, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={style}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function XIcon({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function InviaiLogoMark({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="9" width="18" height="14" rx="3" fill="white" stroke="white" strokeWidth="1.5" />
      <rect x="9" y="13" width="3" height="3" rx="1" fill="#216A56" />
      <rect x="16" y="13" width="3" height="3" rx="1" fill="#216A56" />
      <rect x="11" y="18" width="6" height="1.5" rx="0.75" fill="#216A56" />
      <line x1="14" y1="6" x2="14" y2="9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="5" r="1.5" fill="white" />
      <line x1="5" y1="17" x2="2" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="17" x2="26" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
