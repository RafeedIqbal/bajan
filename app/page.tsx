import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { signOut } from './actions'
import Assistant from './assistant'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export default async function Home() {
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
      <h1>ভাইজান</h1>
      {data.claims.is_anonymous && (
        <p className="note" lang="en">
          You are trying the demo without an account. Signing out ends this demo.
        </p>
      )}
      <Assistant caregiver={caregiver} />
      <details>
        <summary>প্রোফাইল</summary>
        <dl>
          <dt>নাম</dt>
          <dd>{str(p.preferred_name)}</dd>
          <dt>সম্বোধন</dt>
          <dd>{str(p.form_of_address)}</dd>
          <dt>ভাষা</dt>
          <dd>{str(p.language)}</dd>
          <dt>ঠিকানা</dt>
          <dd>{str(p.address)}</dd>
          <dt>পছন্দ</dt>
          <dd>{list(p.preferences).join('; ')}</dd>
          <dt>রোগ</dt>
          <dd>{list(p.conditions).join('; ')}</dd>
          <dt>অ্যালার্জি</dt>
          <dd>{list(p.allergies).join('; ')}</dd>
          <dt>ওষুধ</dt>
          <dd>
            <ul>
              {list(p.medications).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </dd>
          <dt>চিকিৎসা তথ্যের উৎস</dt>
          <dd>{str(p.medical_source)}</dd>
          <dt>সর্বশেষ হালনাগাদ</dt>
          <dd>{str(p.medical_reviewed_on)}</dd>
          <dt>পরিবারের সদস্য</dt>
          <dd>
            {caregiver
              ? [caregiver.name + (caregiver.relationship ? ` (${caregiver.relationship})` : ''), str(p.caregiver.phone)]
                  .filter(Boolean)
                  .join(' — ')
              : '—'}
          </dd>
        </dl>
        <p>
          <a href="/profile">প্রোফাইল বদলান</a>
        </p>
      </details>
      <form>
        <button formAction={signOut}>সাইন আউট</button>
      </form>
    </main>
  )
}
