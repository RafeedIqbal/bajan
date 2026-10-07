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

export const QuestionIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.4-2.6 4M12 17.6v.1" />
  </Icon>
)

export const ArrowLeftIcon = () => (
  <Icon>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)

export const ArrowRightIcon = () => (
  <Icon>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const ChatIcon = () => (
  <Icon>
    <path d="M20.5 11.5a8 8 0 0 1-11.8 7L3.5 20l1.5-4.6a8 8 0 1 1 15.5-3.9z" />
  </Icon>
)

export const UserIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
)

export const SignOutIcon = () => (
  <Icon>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
  </Icon>
)

export const ChevronIcon = () => (
  <Icon className="icon chevron">
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

export const AlertIcon = () => (
  <Icon>
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 10v4.5M12 17.4v.1" />
  </Icon>
)

export const CheckIcon = () => (
  <Icon>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)

export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const CameraIcon = () => (
  <Icon>
    <path d="M3.5 8.5h3.5l2-3h6l2 3h3.5v11h-17z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Icon>
)

export const FileIcon = () => (
  <Icon>
    <path d="M14 3H6v18h12V7z" />
    <path d="M14 3v4h4M9 12h6M9 16h6" />
  </Icon>
)

export const TrashIcon = () => (
  <Icon>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
)
