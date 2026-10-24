import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px]"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/**
 * The Rwandan flag, drawn inline so it renders on every platform (Windows
 * does not ship colour flag emoji). Small and decorative by default because
 * it always sits next to the +250 dial code.
 */
export function RwandaFlag({ className = 'h-3.5 w-5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      {...props}
    >
      <rect width="30" height="20" fill="#00A1DE" />
      <rect y="10" width="30" height="5" fill="#FAD201" />
      <rect y="15" width="30" height="5" fill="#20603D" />
      <g fill="#E5BE01" stroke="#E5BE01" strokeLinecap="round">
        <circle cx="22.6" cy="5.1" r="1.35" stroke="none" />
        <path d="M22.6 3.1v-.8M22.6 8.1v-.8M20.6 5.1h-.8M25.6 5.1h-.8M21.2 3.7l-.55-.55M24.55 6.5l-.55-.55M21.2 6.5l-.55.55M24.55 3.7l-.55.55" strokeWidth=".55" />
      </g>
    </svg>
  )
}

export function MoreIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Base>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19v-8.5z" />
      <path d="M9.5 20.5V14h5v6.5" />
    </Base>
  )
}

export function VaultIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 8.4V12m0 0l2.4 1.6M6 8v-2M18 8v-2" />
    </Base>
  )
}

export function DepositIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v10m0 0l-4-4m4 4l4-4" />
      <path d="M4 17.5v1A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5v-1" />
    </Base>
  )
}

export function LedgerIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 4.5h11.5A1.5 1.5 0 0118 6v14H6.5A1.5 1.5 0 015 18.5v-14z" />
      <path d="M5 16.5h13M9 8h5.5" />
    </Base>
  )
}

export function BulletinIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 10.5v3a1.5 1.5 0 001.5 1.5H7l3.5 4V5L7 9H5.5A1.5 1.5 0 004 10.5z" />
      <path d="M14.5 8.5a5 5 0 010 7M17.5 6a8.5 8.5 0 010 12" />
    </Base>
  )
}

export function DeskIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <path d="M9 7.5V6a2 2 0 012-2h2a2 2 0 012 2v1.5M3 13h18" />
    </Base>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-2.87 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 006.2 19.4l-.06.06A2 2 0 113.3 16.6l.06-.06A1.7 1.7 0 003 13.7H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.87l-.06-.06A2 2 0 117.07 3.5l.06.06A1.7 1.7 0 0010 2.3V2a2 2 0 114 0v.1a1.7 1.7 0 002.87 1.2l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0021 10.3h.1a2 2 0 110 4H21a1.7 1.7 0 00-1.6 1.2z" />
    </Base>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 4.5h2A2.5 2.5 0 0119.5 7v10a2.5 2.5 0 01-2.5 2.5h-2" />
      <path d="M10 16l-4-4 4-4M6 12h9" />
    </Base>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Base>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.2-4.2" />
    </Base>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8.5 10V7.5a3.5 3.5 0 017 0V10M12 14v2.5" />
    </Base>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 6.3a3.5 3.5 0 010 6.4M17.5 20c0-2.2-.7-3.9-2-5" />
    </Base>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5l7 2.5v5.5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6l7-2.5z" />
      <path d="M9 12l2 2 4-4" />
    </Base>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="6" width="16" height="14" rx="2.5" />
      <path d="M4 10.5h16M9 4.5v3M15 4.5v3" />
    </Base>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5a10 10 0 01-2.6-.34L5 20.5l1.3-3.4A6.6 6.6 0 014 12.5C4 8.9 7.6 6 12 6s8 2.9 8 6.5z" />
    </Base>
  )
}

export function LoanIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4.5v15M8 8.5h6.5a2.5 2.5 0 010 5h-5a2.5 2.5 0 000 5H16" />
    </Base>
  )
}

export function ShuffleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6.5h3.5L16 17.5h4M4 17.5h3.5l2.2-2.9M20 6.5h-4l-2.2 2.9" />
      <path d="M17 4.5l3 2-3 2M17 15.5l3 2-3 2" />
    </Base>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.8" />
    </Base>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 6.5V6A2 2 0 0013 4H6a2 2 0 00-2 2v7a2 2 0 002 2h.5" />
    </Base>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 9a6 6 0 1112 0c0 4.5 1.5 6 1.5 6h-15S6 13.5 6 9z" />
      <path d="M10 19a2 2 0 004 0" />
    </Base>
  )
}
