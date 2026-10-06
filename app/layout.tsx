import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ভাইজান',
  description: 'বাংলা ভয়েস সহকারী (পরীক্ষামূলক)',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  )
}
