import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { langFrom, text } from '@/lib/i18n'
import { setLanguage } from './actions'
import still from './avatar.webp'
import { QuestionIcon } from './icons'
import NavLink from './nav-link'
import SubmitButton from './submit-button'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const t = text(langFrom((await cookies()).get('lang')?.value))
  // Each page names itself, so screen readers announce where a redirect landed.
  return { title: { default: t.title, template: `%s · ${t.title}` }, description: t.tagline }
}

export const viewport: Viewport = { themeColor: '#00573f' } // never limit zoom

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const lang = langFrom((await cookies()).get('lang')?.value)
  const t = text(lang)
  return (
    <html lang={lang} data-scroll-behavior="smooth">
      <body>
        <header className="site-header">
          <div className="header-inner">
            {/* Not a link: a stray tap on it would reload the page and end a conversation. */}
            <div className="brand">
              <Image src={still} alt="" width={40} height={40} />
              <span className="brand-name">{t.title}</span>
            </div>
            <NavLink href="/guide">
              <QuestionIcon />
              <span>{t.guideNav}</span>
            </NavLink>
            {/* Two fixed buttons, not one that swaps: a double tap can't flip the language back. */}
            <form action={setLanguage} className="lang-toggle">
              <SubmitButton name="lang" value="bn" lang="bn" aria-pressed={lang === 'bn'}>
                বাংলা
              </SubmitButton>
              <SubmitButton name="lang" value="en" lang="en" aria-pressed={lang === 'en'}>
                English
              </SubmitButton>
            </form>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
