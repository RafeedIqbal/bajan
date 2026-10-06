import { createClient } from '@/lib/supabase'
import { sendMagicLink, sendPasswordReset, signIn, signUp, tryDemo, updatePassword } from '../actions'

// Fixed strings only: query parameters never put arbitrary text on the page.
const ERRORS: Record<string, string> = {
  missing: 'Enter your email (and password).',
  bad_login: 'Email or password is incorrect, or the email is not confirmed yet.',
  signup: 'Could not create the account. Use a password of at least 6 characters.',
  email: 'Could not send the email right now. Wait a minute and try again.',
  link: 'That link did not work. Open the newest email in this same browser, or request a new one.',
  password: 'Could not update the password. Use at least 6 characters.',
  demo: 'Could not start the demo right now. Wait a minute and try again.',
}
const MESSAGES: Record<string, string> = {
  check_email: 'Check your email for the link.',
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { e, m, reset } = await searchParams
  const error = typeof e === 'string' ? ERRORS[e] : undefined
  const message = typeof m === 'string' ? MESSAGES[m] : undefined

  let resetting = false
  if (reset === '1') {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    resetting = !!data?.claims
  }

  return (
    <main lang="en" className="auth">
      <h1>Bhaijaan</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {resetting ? (
        <form>
          <label>
            New password
            <input name="password" type="password" autoComplete="new-password" minLength={6} required />
          </label>
          <button formAction={updatePassword}>Save password</button>
        </form>
      ) : (
        <form>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" />
          </label>
          <button formAction={signIn}>Sign in</button>
          <button formAction={signUp}>Create account</button>
          <button formAction={sendMagicLink}>Email me a sign-in link</button>
          <button formAction={sendPasswordReset}>Forgot password</button>
        </form>
      )}
      {!resetting && (
        <>
          <h2>Just trying it out?</h2>
          <p>Use a demo with a sample profile. No account or email needed.</p>
          <form>
            <button className="primary" formAction={tryDemo}>
              Try the demo
            </button>
          </form>
        </>
      )}
    </main>
  )
}
