import type { Metadata } from 'next'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { langFrom, text } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import { sendMagicLink, sendPasswordReset, signIn, signUp, tryDemo, updatePassword } from '../actions'
import still from '../avatar.webp'
import { CheckIcon, QuestionIcon } from '../icons'
import SubmitButton from '../submit-button'

export async function generateMetadata(): Promise<Metadata> {
  return { title: text(langFrom((await cookies()).get('lang')?.value)).signIn }
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const t = text(langFrom((await cookies()).get('lang')?.value))
  const { e, m, reset } = await searchParams
  // Fixed strings only: query parameters never put arbitrary text on the page.
  const error = typeof e === 'string' ? t.loginErrors[e] : undefined
  const message = m === 'check_email' ? t.checkEmail : undefined

  let resetting = false
  if (reset === '1') {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    resetting = !!data?.claims
  }

  return (
    <main className="login">
      <section className="welcome">
        <Image src={still} alt="" width={180} height={180} loading="eager" />
        <h1>{t.title}</h1>
        <p className="lead">{t.tagline}</p>
        <ul className="features">
          {t.features.map((f) => (
            <li key={f}>
              <CheckIcon />
              {f}
            </li>
          ))}
        </ul>
        <a className="text-link" href="/guide">
          <QuestionIcon />
          {t.guideLink}
        </a>
      </section>

      <div className="login-forms">
        {error && <p role="alert">{error}</p>}
        {message && (
          <p role="status" className="banner">
            {message}
          </p>
        )}
        {resetting ? (
          <form className="card">
            <label>
              {t.newPassword}
              <input name="password" type="password" autoComplete="new-password" minLength={6} required />
            </label>
            <SubmitButton className="primary" formAction={updatePassword}>
              {t.savePassword}
            </SubmitButton>
          </form>
        ) : (
          <>
            {/* Its own form: the email field below is required, which would block it. */}
            <form className="card highlight">
              <h2>{t.demoTitle}</h2>
              <p>{t.demoText}</p>
              <SubmitButton className="primary" formAction={tryDemo}>
                {t.tryDemo}
              </SubmitButton>
            </form>
            <p className="divider">{t.orSignIn}</p>
            <form className="card">
              <label>
                {t.email}
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                {t.password}
                <input name="password" type="password" autoComplete="current-password" />
              </label>
              <SubmitButton className="primary" formAction={signIn}>
                {t.signIn}
              </SubmitButton>
              <SubmitButton formAction={signUp}>{t.createAccount}</SubmitButton>
              <div className="row">
                <SubmitButton className="ghost" formAction={sendMagicLink}>
                  {t.emailLink}
                </SubmitButton>
                <SubmitButton className="ghost" formAction={sendPasswordReset}>
                  {t.forgotPassword}
                </SubmitButton>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
