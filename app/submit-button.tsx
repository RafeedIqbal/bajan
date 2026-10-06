'use client'

import type { ComponentProps } from 'react'
import { useFormStatus } from 'react-dom'
import { Spinner } from './icons'

// Either `formAction`, or a form with its own `action` (React won't take `name` together with `formAction`).
type Props = Omit<ComponentProps<'button'>, 'formAction'> & { formAction?: (form: FormData) => Promise<void> }

// A server-action button that ignores presses while its form is busy: older hands double-tap, and a second
// "Try the demo" would spend another of the shared anonymous sign-ins. aria-disabled, not disabled, so focus
// and the screen reader stay on the button. The spinner shows only on the button that was pressed.
export default function SubmitButton({ formAction, children, name, value, ...props }: Props) {
  const { pending, action, data } = useFormStatus()
  const mine = pending && (!formAction || action === formAction) && (!name || data?.get(name) === value)
  return (
    <button
      {...props}
      name={name}
      value={value}
      formAction={formAction}
      aria-disabled={pending || undefined}
      onClick={(e) => pending && e.preventDefault()}
    >
      {mine && <Spinner />}
      {children}
    </button>
  )
}
