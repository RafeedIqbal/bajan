import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEFAULT_SPEECH, langFrom, SPEECH, text, type Speech } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import { signOut } from './actions'
import Assistant from './assistant'
import SubmitButton from './submit-button'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export default async function Home() {
  const lang = langFrom((await cookies()).get('lang')?.value)
  const t = text(lang)
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (isAuthRetryableFetchError(authError)) throw authError // a network blip, not a sign-out
  if (!data?.claims) redirect('/login')
  // RLS returns only the caller's own profile.
  const { data: profile, error } = await supabase.from('profiles').select('data').maybeSingle()
  if (error) throw error // a database blip must not look like "no profile yet"
  if (!profile) redirect('/profile') // onboarding

  const p = profile.data
  const caregiver = str(p.caregiver?.name) ? { name: str(p.caregiver.name), relationship: str(p.caregiver.relationship) } : null
  return (
    <main>
      <h1 className="sr-only">{t.title}</h1>
      {data.claims.is_anonymous && <p className="banner">{t.demoNote}</p>}
      <Assistant caregiver={caregiver} lang={lang} />
      <details className="card">
        <summary>{t.profile}</summary>
        <dl>
          <dt>{t.field.name}</dt>
          <dd>{str(p.preferred_name)}</dd>
          <dt>{t.field.formOfAddress}</dt>
          <dd>{str(p.form_of_address)}</dd>
          <dt>{t.field.speech}</dt>
          <dd>{t.speechScale[SPEECH.indexOf((p.language_preference as Speech) ?? DEFAULT_SPEECH)] ?? t.speechScale[2]}</dd>
          <dt>{t.field.address}</dt>
          <dd>{str(p.address)}</dd>
          <dt>{t.field.preferences}</dt>
          <dd>{list(p.preferences).join('; ')}</dd>
          <dt>{t.field.conditions}</dt>
          <dd>{list(p.conditions).join('; ')}</dd>
          <dt>{t.field.allergies}</dt>
          <dd>{list(p.allergies).join('; ')}</dd>
          <dt>{t.field.medications}</dt>
          <dd>
            <ul>
              {list(p.medications).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </dd>
          <dt>{t.field.medicalSource}</dt>
          <dd>{str(p.medical_source)}</dd>
          <dt>{t.field.updated}</dt>
          <dd>{str(p.medical_reviewed_on)}</dd>
          <dt>{t.field.caregiver}</dt>
          <dd>
            {caregiver
              ? [caregiver.name + (caregiver.relationship ? ` (${caregiver.relationship})` : ''), str(p.caregiver.phone)]
                  .filter(Boolean)
                  .join(' — ')
              : '—'}
          </dd>
        </dl>
      </details>
      <form className="row">
        <a className="button" href="/profile">
          {t.editProfile}
        </a>
        <SubmitButton formAction={signOut}>{t.signOut}</SubmitButton>
      </form>
    </main>
  )
}
