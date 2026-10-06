import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { saveProfile, saveSampleProfile, signOut } from '../actions'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const lines = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join('\n') : '')

// Onboarding (no profile yet) and later edits: one form, every field optional.
export default async function ProfilePage({ searchParams }: PageProps<'/profile'>) {
  const { e } = await searchParams
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (isAuthRetryableFetchError(authError)) throw authError // a network blip, not a sign-out
  if (!data?.claims) redirect('/login')
  // RLS returns only the caller's own profile.
  const { data: profile, error } = await supabase.from('profiles').select('data').maybeSingle()
  if (error) throw error
  const p = profile?.data ?? {}

  return (
    <main>
      <h1>{profile ? 'প্রোফাইল বদলান' : 'আপনার প্রোফাইল'}</h1>
      <p>
        সব ঘর ঐচ্ছিক — যা জানাতে চান শুধু তা লিখুন। ভাইজান এই তথ্য দেখে উত্তর দেবেন।{' '}
        <span lang="en">(Every field is optional.)</span>
      </p>
      <p className="note">
        পরীক্ষার সময় কাল্পনিক তথ্য দিন, আসল চিকিৎসা তথ্য নয়। <span lang="en">Please use made-up details while testing.</span>
      </p>
      {e === 'save' && (
        <p role="alert">
          সংরক্ষণ হয়নি, আবার চেষ্টা করুন। <span lang="en">Could not save; please try again.</span>
        </p>
      )}

      {!profile && (
        <form>
          <button formAction={saveSampleProfile}>
            নমুনা প্রোফাইল দিয়ে শুরু করুন <span lang="en">(use the sample profile)</span>
          </button>
        </form>
      )}

      <form>
        <label>
          যে নামে ডাকবে <span lang="en">(name)</span>
          <input type="text" name="preferred_name" maxLength={200} defaultValue={str(p.preferred_name)} autoComplete="off" />
        </label>
        <label>
          সম্বোধন, যেমন নানু, চাচা, আপা <span lang="en">(how to address you)</span>
          <input type="text" name="form_of_address" maxLength={200} defaultValue={str(p.form_of_address)} autoComplete="off" />
        </label>
        <label>
          ঠিকানা <span lang="en">(address)</span>
          <input type="text" name="address" maxLength={300} defaultValue={str(p.address)} autoComplete="off" />
        </label>
        <label>
          পছন্দ — প্রতি লাইনে একটি <span lang="en">(preferences, one per line)</span>
          <textarea name="preferences" rows={3} maxLength={4000} defaultValue={lines(p.preferences)} />
        </label>
        <label>
          রোগ — প্রতি লাইনে একটি <span lang="en">(conditions, one per line)</span>
          <textarea name="conditions" rows={3} maxLength={4000} defaultValue={lines(p.conditions)} />
        </label>
        <label>
          অ্যালার্জি — প্রতি লাইনে একটি <span lang="en">(allergies, one per line)</span>
          <textarea name="allergies" rows={2} maxLength={4000} defaultValue={lines(p.allergies)} />
        </label>
        <label>
          ওষুধ, ডোজ ও সময় — প্রতি লাইনে একটি, সর্বোচ্চ ২০টি <span lang="en">(medicines with dose and time, one per line, up to 20)</span>
          <textarea
            name="medications"
            rows={4}
            maxLength={4000}
            placeholder="Metformin 500 mg — সকাল ৮টা ও রাত ৮টা"
            defaultValue={lines(p.medications)}
          />
        </label>

        <fieldset>
          <legend>
            পরিবারের যাঁকে ফোন করা হবে <span lang="en">(family member to call)</span>
          </legend>
          <label>
            নাম <span lang="en">(name)</span>
            <input type="text" name="caregiver_name" maxLength={200} defaultValue={str(p.caregiver?.name)} autoComplete="off" />
          </label>
          <label>
            সম্পর্ক, যেমন ছেলে, মেয়ে <span lang="en">(relationship)</span>
            <input type="text" name="caregiver_relationship" maxLength={200} defaultValue={str(p.caregiver?.relationship)} autoComplete="off" />
          </label>
          <label>
            ফোন নম্বর <span lang="en">(phone — test calls never dial it)</span>
            <input type="tel" name="caregiver_phone" maxLength={30} defaultValue={str(p.caregiver?.phone)} autoComplete="off" />
          </label>
        </fieldset>

        <button className="primary" formAction={saveProfile}>
          সংরক্ষণ করুন <span lang="en">(save)</span>
        </button>
      </form>

      {profile && (
        <p>
          <a href="/">← ফিরে যান</a>
        </p>
      )}
      <form>
        <button formAction={signOut}>সাইন আউট</button>
      </form>
    </main>
  )
}
