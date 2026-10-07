import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEFAULT_SPEECH, langFrom, SPEECH, text, type Speech } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import { saveProfile, saveSampleProfile, signOut } from '../actions'
import { ArrowLeftIcon, SignOutIcon } from '../icons'
import LanguageSlider from '../language-slider'
import SubmitButton from '../submit-button'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const lines = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join('\n') : '')

export async function generateMetadata(): Promise<Metadata> {
  return { title: text(langFrom((await cookies()).get('lang')?.value)).profile }
}

// Onboarding (no profile yet) and later edits, the demo's sample profile included: one form, every field optional.
export default async function ProfilePage({ searchParams }: PageProps<'/profile'>) {
  const t = text(langFrom((await cookies()).get('lang')?.value))
  const { e } = await searchParams
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (isAuthRetryableFetchError(authError)) throw authError // a network blip, not a sign-out
  if (!data?.claims) redirect('/login')
  // RLS returns only the caller's own profile.
  const { data: profile, error } = await supabase.from('profiles').select('data').maybeSingle()
  if (error) throw error
  const p = profile?.data ?? {}
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
          <legend>{t.sections.health}</legend>
          <label>
            {t.label.preferences}
            <textarea name="preferences" rows={3} maxLength={4000} defaultValue={lines(p.preferences)} />
          </label>
          <label>
            {t.label.conditions}
            <textarea name="conditions" rows={3} maxLength={4000} defaultValue={lines(p.conditions)} />
          </label>
          <label>
            {t.label.allergies}
            <textarea name="allergies" rows={2} maxLength={4000} defaultValue={lines(p.allergies)} />
          </label>
          <label>
            {t.label.medications}
            <textarea
              name="medications"
              rows={4}
              maxLength={4000}
              placeholder={t.medicationsPlaceholder}
              defaultValue={lines(p.medications)}
            />
          </label>
        </fieldset>

        <fieldset className="card">
          <legend>{t.label.caregiver}</legend>
          <div className="fields-2">
            <label>
              {t.label.caregiverName}
              <input type="text" name="caregiver_name" maxLength={200} defaultValue={str(p.caregiver?.name)} autoComplete="off" />
            </label>
            <label>
              {t.label.caregiverRelationship}
              <input type="text" name="caregiver_relationship" maxLength={200} defaultValue={str(p.caregiver?.relationship)} autoComplete="off" />
            </label>
          </div>
          <label>
            {t.label.caregiverPhone}
            <input type="tel" name="caregiver_phone" maxLength={30} defaultValue={str(p.caregiver?.phone)} autoComplete="off" />
          </label>
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
