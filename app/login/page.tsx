import { cookies } from 'next/headers'
import { langFrom, text } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import { sendMagicLink, sendPasswordReset, signIn, signUp, tryDemo, updatePassword } from '../actions'

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
    <main className="auth">
      <h1>{t.title}</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {resetting ? (
        <form>
          <label>
            {t.newPassword}
            <input name="password" type="password" autoComplete="new-password" minLength={6} required />
          </label>
          <button formAction={updatePassword}>{t.savePassword}</button>
        </form>
      ) : (
        <>
          <form>
            <label>
              {t.email}
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              {t.password}
              <input name="password" type="password" autoComplete="current-password" />
            </label>
            <button formAction={signIn}>{t.signIn}</button>
            <button formAction={signUp}>{t.createAccount}</button>
            <button formAction={sendMagicLink}>{t.emailLink}</button>
            <button formAction={sendPasswordReset}>{t.forgotPassword}</button>
          </form>
          <h2>{t.demoTitle}</h2>
          <p>{t.demoText}</p>
          <form>
            <button className="primary" formAction={tryDemo}>
              {t.tryDemo}
            </button>
          </form>
        </>
      )}
    </main>
  )
}
