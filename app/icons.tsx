// Inline icons drawn on a 24px grid in currentColor. Always next to a text label, so hidden from screen readers.

function Icon({ children, className = 'icon' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const MicIcon = () => (
  <Icon>
    <rect x="9" y="2.5" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </Icon>
)

export const StopIcon = () => (
  <Icon>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </Icon>
)

export const PhoneIcon = () => (
  <Icon>
    <path d="M5 3.5h3.5l2 5-2.5 1.6a11 11 0 0 0 5.9 5.9l1.6-2.5 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z" />
  </Icon>
)

export const RepeatIcon = () => (
  <Icon>
    <path d="M17 2.5 20.5 6 17 9.5M3.5 11.5V10a4 4 0 0 1 4-4h13M7 21.5 3.5 18 7 14.5M20.5 12.5V14a4 4 0 0 1-4 4h-13" />
  </Icon>
)

export const SendIcon = () => (
  <Icon>
    <path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />
  </Icon>
)

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const RecordDot = () => (
  <Icon>
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </Icon>
)

export const Spinner = () => (
  <Icon className="icon spinner">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Icon>
)
