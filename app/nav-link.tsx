'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// A header link that marks the page you are on (aria-current), for screen readers and the eye.
export default function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="nav-link" href={href} aria-current={usePathname() === href ? 'page' : undefined}>
      {children}
    </a>
  )
}
