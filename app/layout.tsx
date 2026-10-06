import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { langFrom, text } from '@/lib/i18n'
import { setLanguage } from './actions'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  return { title: text(langFrom((await cookies()).get('lang')?.value)).title }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const lang = langFrom((await cookies()).get('lang')?.value)
  return (
    <html lang={lang}>
      <body>
        {/* Two fixed buttons, not one that swaps: a double tap can't flip the language back. */}
        <form action={setLanguage} className="lang-toggle">
          <button name="lang" value="bn" lang="bn" aria-pressed={lang === 'bn'}>
            বাংলা
          </button>
          <button name="lang" value="en" lang="en" aria-pressed={lang === 'en'}>
            English
          </button>
        </form>
        {children}
      </body>
    </html>
  )
}
