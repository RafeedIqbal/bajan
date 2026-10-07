import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEFAULT_SPEECH, langFrom, SPEECH, text, type Speech } from '@/lib/i18n'
import { BLOOD_GROUPS, cleanList, cleanMedications, contactsOf, GENDERS, NEEDS, ROUTINE, type Profile } from '@/lib/profile'
import { createClient } from '@/lib/supabase'
import { saveProfile, saveSampleProfile, signOut } from '../actions'
import { ArrowLeftIcon, SignOutIcon } from '../icons'
import LanguageSlider from '../language-slider'
import SubmitButton from '../submit-button'
import BirthYear from './birth-year'
import ContactList from './contact-list'
import HealthEditor from './health-editor'
import ItemList from './item-list'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export async function generateMetadata(): Promise<Metadata> {
  return { title: text(langFrom((await cookies()).get('lang')?.value)).profile }
}

// Onboarding (no profile yet) and later edits, the demo's sample profile included: one form, every field optional.
export default async function ProfilePage({ searchParams }: PageProps<'/profile'>) {
  const lang = langFrom((await cookies()).get('lang')?.value)
  const t = text(lang)
  const { e } = await searchParams
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (isAuthRetryableFetchError(authError)) throw authError // a network blip, not a sign-out
  if (!data?.claims) redirect('/login')
  // RLS returns only the caller's own profile.
  const { data: profile, error } = await supabase.from('profiles').select('data').maybeSingle()
  if (error) throw error
  const p: Profile = profile?.data ?? {}
  const speech = SPEECH.indexOf((p.language_preference as Speech) ?? DEFAULT_SPEECH)

  return (
    <main>
      <div className="page-head">
        {profile && (
          <a className="text-link" href="/">
            <ArrowLeftIcon />
            {t.back}
          </a>
        )}
        <h1>{profile ? t.editProfile : t.setupTitle}</h1>
        <p className="lead">{t.intro}</p>
      </div>
      <p className="banner">{t.madeUp}</p>
      {e === 'save' && <p role="alert">{t.saveError}</p>}

      {!profile && (
        <form className="card highlight">
          <SubmitButton className="primary" formAction={saveSampleProfile}>
            {t.useSample}
          </SubmitButton>
        </form>
      )}

      <form className="form-stack">
        <fieldset className="card">
          <legend>{t.sections.about}</legend>
          <div className="fields-2">
            <label>
              {t.label.name}
              <input type="text" name="preferred_name" maxLength={200} defaultValue={str(p.preferred_name)} autoComplete="off" />
            </label>
            <label>
              {t.label.formOfAddress}
              <input type="text" name="form_of_address" maxLength={200} defaultValue={str(p.form_of_address)} autoComplete="off" />
            </label>
          </div>
          <div className="fields-2">
            <BirthYear lang={lang} initial={p.birth_year ? String(p.birth_year) : ''} />
            <label>
              {t.label.gender}
              <select name="gender" defaultValue={p.gender ?? ''}>
                <option value="">{t.notGiven}</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {t.genders[g]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <LanguageSlider
            label={t.label.speech}
            scale={t.speechScale}
            initial={speech < 0 ? SPEECH.indexOf(DEFAULT_SPEECH) : speech}
          />
          <label>
            {t.label.address}
            <input type="text" name="address" maxLength={300} defaultValue={str(p.address)} autoComplete="off" />
          </label>
        </fieldset>

        <fieldset className="card">
          <legend>{t.sections.life}</legend>
          <ItemList
            name="preferences"
            label={t.label.preferences}
            lang={lang}
            placeholder={t.placeholders.preferences}
            initial={cleanList(p.preferences)}
          />
          <fieldset className="choice sub">
            <legend>{t.label.needs}</legend>
            {NEEDS.map((k) => (
              <label key={k}>
                {t.needs[k]}
                <input type="text" name={`needs_${k}`} maxLength={200} defaultValue={str(p.needs?.[k])} autoComplete="off" />
              </label>
            ))}
          </fieldset>
          <fieldset className="choice sub">
            <legend>{t.label.routine}</legend>
            <div className="fields-2 times">
              {ROUTINE.map((k) => (
                <label key={k}>
                  {t.routine[k]}
                  <input type="time" name={`routine_${k}`} defaultValue={str(p.routine?.[k])} />
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>

        <fieldset className="card">
          <legend>{t.sections.health}</legend>
          <div className="fields-2">
            <label>
              {t.label.bloodGroup}
              <select name="blood_group" defaultValue={p.blood_group ?? ''}>
                <option value="">{t.notGiven}</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <HealthEditor
            lang={lang}
            conditions={cleanList(p.conditions)}
            allergies={cleanList(p.allergies)}
            medications={cleanMedications(p.medications)}
          />
        </fieldset>

        <fieldset className="card">
          <legend>{t.sections.contacts}</legend>
          <ContactList lang={lang} initial={contactsOf(p)} />
        </fieldset>

        <SubmitButton className="primary" formAction={saveProfile}>
          {t.save}
        </SubmitButton>
      </form>

      <form>
        <SubmitButton formAction={signOut}>
          <SignOutIcon />
          {t.signOut}
        </SubmitButton>
      </form>
    </main>
  )
}
