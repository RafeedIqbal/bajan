import { cookies } from 'next/headers'
import { langFrom, text } from '@/lib/i18n'

export default async function NotFound() {
  const t = text(langFrom((await cookies()).get('lang')?.value))
  return (
    <main>
      <div className="card">
        <h1>{t.notFound}</h1>
        <a className="button" href="/">
          {t.goHome}
        </a>
      </div>
    </main>
  )
}
