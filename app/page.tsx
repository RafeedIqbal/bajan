import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEFAULT_SPEECH, langFrom, SPEECH, text, type Speech } from '@/lib/i18n'
import { ageFrom, cleanList, cleanMedications, contactsOf, formatMedication, NEEDS, ROUTINE, type Profile } from '@/lib/profile'
import { createClient } from '@/lib/supabase'
import { signOut } from './actions'
import Assistant from './assistant'
import { ChevronIcon, QuestionIcon, SignOutIcon, UserIcon } from './icons'
import SubmitButton from './submit-button'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

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

  const p: Profile = profile.data
  const age = ageFrom(p.birth_year)
  const contacts = contactsOf(p)
  const caregiver = str(p.caregiver?.name) ? { name: str(p.caregiver?.name), relationship: str(p.caregiver?.relationship) } : null
  return (
    <main className="wide">
      <h1 className="sr-only">{t.title}</h1>
      <Assistant caregiver={caregiver} lang={lang} notice={data.claims.is_anonymous && <p className="banner">{t.demoNote}</p>}>
        <details className="card">
          <summary>
            <span className="card-title">
              <UserIcon />
              {t.profile}
            </span>
            <ChevronIcon />
          </summary>
          <dl>
            <dt>{t.field.name}</dt>
            <dd>{str(p.preferred_name)}</dd>
            <dt>{t.field.formOfAddress}</dt>
            <dd>{str(p.form_of_address)}</dd>
            <dt>{t.field.speech}</dt>
            <dd>{t.speechScale[SPEECH.indexOf((p.language_preference as Speech) ?? DEFAULT_SPEECH)] ?? t.speechScale[2]}</dd>
            <dt>{t.field.address}</dt>
            <dd>{str(p.address)}</dd>
            <dt>{t.field.age}</dt>
            <dd>{age === null ? '' : t.age(age)}</dd>
            <dt>{t.field.gender}</dt>
            <dd>{p.gender ? t.genders[p.gender] : ''}</dd>
            <dt>{t.field.preferences}</dt>
            <dd>{cleanList(p.preferences).join('; ')}</dd>
            <dt>{t.field.needs}</dt>
            <dd>{NEEDS.map((k) => p.needs?.[k]).filter(Boolean).join('; ')}</dd>
            <dt>{t.field.routine}</dt>
            <dd>
              {ROUTINE.filter((k) => p.routine?.[k])
                .map((k) => `${t.routine[k]}: ${t.clockTime(p.routine![k]!)}`)
                .join('; ')}
            </dd>
            <dt>{t.field.bloodGroup}</dt>
            <dd>{p.blood_group ?? ''}</dd>
            <dt>{t.field.conditions}</dt>
            <dd>{cleanList(p.conditions).join('; ')}</dd>
            <dt>{t.field.allergies}</dt>
            <dd>{cleanList(p.allergies).join('; ')}</dd>
            <dt>{t.field.medications}</dt>
            <dd>
              <ul>
                {cleanMedications(p.medications).map((m, i) => (
                  <li key={i}>{formatMedication(m, { times: t.times, meal: t.meals })}</li>
                ))}
              </ul>
            </dd>
            <dt>{t.field.medicalSource}</dt>
            <dd>{str(p.medical_source)}</dd>
            <dt>{t.field.updated}</dt>
            <dd>{str(p.medical_reviewed_on)}</dd>
            <dt>{t.field.contacts}</dt>
            <dd>
              {contacts.length ? (
                <ul>
                  {contacts.map((c, i) => (
                    <li key={i}>
                      {[c.name || t.roles[c.role], c.name && (c.role === 'other' ? c.detail : [t.roles[c.role], c.detail].filter(Boolean).join(', ')), c.phone]
                        .filter(Boolean)
                        .join(' — ')}
                      {c.call_for_help && <strong> ({t.field.callsForHelp})</strong>}
                    </li>
                  ))}
                </ul>
              ) : (
                '—'
              )}
            </dd>
          </dl>
        </details>
        <form className="actions">
          <a className="button" href="/profile">
            <UserIcon />
            {t.editProfile}
          </a>
          <a className="button" href="/guide">
            <QuestionIcon />
            {t.guideNav}
          </a>
          <SubmitButton formAction={signOut}>
            <SignOutIcon />
            {t.signOut}
          </SubmitButton>
        </form>
      </Assistant>
    </main>
  )
}
