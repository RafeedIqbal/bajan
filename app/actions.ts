'use server'

import { refresh } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEFAULT_SPEECH, langFrom, SPEECH, text as screenText } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'

// Next.js rejects server actions whose Origin doesn't match the host, so a present Origin is trusted.
// ponytail: no CAPTCHA on open sign-up; Supabase's email rate cap (keep the 30/h default) is the abuse ceiling.
// ponytail: auth calls run server-side, so all users share Vercel's egress IP in Supabase's per-IP limits;
// move them to a browser client (or forward the IP with a secret key) if testers get rate-limited.

function email(form: FormData) {
  const v = form.get('email')
  return typeof v === 'string' ? v.trim() : ''
}

function password(form: FormData) {
  const v = form.get('password')
  return typeof v === 'string' ? v : ''
}

async function callbackUrl(next?: 'reset') {
  const origin = (await headers()).get('origin')
  // Without an Origin (non-browser client), let Supabase fall back to the project's Site URL.
  return origin ? `${origin}/auth/callback${next ? `?next=${next}` : ''}` : undefined
}

export async function signIn(form: FormData) {
  if (!email(form) || !password(form)) redirect('/login?e=missing')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email(form), password: password(form) })
  if (error) redirect('/login?e=bad_login')
  redirect('/')
}

export async function signUp(form: FormData) {
  if (!email(form) || !password(form)) redirect('/login?e=missing')
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: email(form),
    password: password(form),
    options: { emailRedirectTo: await callbackUrl() },
  })
  if (error) redirect('/login?e=signup')
  redirect(data.session ? '/' : '/login?m=check_email')
}

export async function sendMagicLink(form: FormData) {
  if (!email(form)) redirect('/login?e=missing')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email(form),
    options: { emailRedirectTo: await callbackUrl() },
  })
  if (error) redirect('/login?e=email')
  redirect('/login?m=check_email')
}

export async function sendPasswordReset(form: FormData) {
  if (!email(form)) redirect('/login?e=missing')
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email(form), {
    redirectTo: await callbackUrl('reset'),
  })
  if (error) redirect('/login?e=email')
  redirect('/login?m=check_email')
}

export async function updatePassword(form: FormData) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login?e=link')
  const { error } = await supabase.auth.updateUser({ password: password(form) })
  if (error) redirect('/login?reset=1&e=password')
  redirect('/')
}

// The demo's sample person (not real). Also offered at onboarding as a one-click starting point.
const SAMPLE_PROFILE = {
  preferred_name: 'রহিমা খাতুন',
  form_of_address: 'নানু',
  language_preference: 'bangla_preferred',
  address: 'বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা ১২০৫',
  preferences: ['সকালে আদা-চা পছন্দ করেন', 'বিকেলে রেডিওতে রবীন্দ্রসংগীত শোনেন', 'ধীরে ও একটু জোরে বললে ভালো শোনেন'],
  conditions: ['উচ্চ রক্তচাপ', 'টাইপ ২ ডায়াবেটিস'],
  allergies: ['পেনিসিলিন'],
  medications: ['Amlodipine 5 mg — ১টি ট্যাবলেট — সকাল ৮টা', 'Metformin 500 mg — ১টি ট্যাবলেট — সকাল ৮টা ও রাত ৮টা'],
  medical_source: 'কাল্পনিক নমুনা তথ্য — আসল কারো নয় (synthetic sample)',
  medical_reviewed_on: '2026-10-01',
  caregiver: { name: 'করিম', relationship: 'ছেলে', phone: '+8801700000000' },
}

// Try it without an account: an anonymous Supabase user with the sample profile. Each visitor gets their
// own user, so demo sessions and help requests never mix.
// ponytail: anonymous sign-ins are capped per IP (30/h by default) and, being server-side, all visitors
// share Vercel's IP — raise the limit in Supabase if testers hit it. No CAPTCHA: the Gemini budget alert
// is the spending ceiling.
export async function tryDemo() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInAnonymously()
  if (error) console.error('demo sign-in failed', error) // e.g. anonymous sign-ins off, or the hourly cap hit
  const saved = error ? null : await supabase.rpc('save_my_profile', { p_data: SAMPLE_PROFILE })
  if (saved?.error) console.error('demo profile failed', saved.error)
  if (error || saved?.error) redirect('/login?e=demo')
  redirect('/')
}

export async function saveSampleProfile() {
  await save(SAMPLE_PROFILE)
}

const SELF_REPORTED = 'নিজে দেওয়া তথ্য — যাচাই করা হয়নি (self-reported, not verified)'

// Onboarding and edits. Every field is optional; blank ones are simply not recorded.
// ponytail: a failed save re-renders the form from the database, so typed input is lost; keep it with
// useActionState if saves ever fail in practice.
export async function saveProfile(form: FormData) {
  // Cut by code points: a String.slice cut can split an emoji, which PostgREST rejects as invalid JSON.
  const cap = (s: string, n: number) => Array.from(s).slice(0, n).join('')
  const text = (name: string, max = 200) => {
    const v = form.get(name)
    return typeof v === 'string' ? cap(v.trim(), max) : ''
  }
  const lines = (name: string) =>
    text(name, 4000)
      .split('\n')
      .map((line) => cap(line.trim(), 200))
      .filter(Boolean)
      .slice(0, 20)
  const medical = { conditions: lines('conditions'), allergies: lines('allergies'), medications: lines('medications') }

  // Keep the medical label and date unless the medical details themselves changed (e.g. only a phone
  // number was edited): what the user types is their own statement, not a verified record.
  const supabase = await createClient()
  const { data: current } = await supabase.from('profiles').select('data').maybeSingle()
  const old = current?.data
  const same = old && JSON.stringify([old.conditions, old.allergies, old.medications]) === JSON.stringify(Object.values(medical))

  // A relationship or a number alone still names someone to call ("ছেলে-কে ফোন করবো?").
  const phone = text('caregiver_phone', 30)
  const relationship = text('caregiver_relationship')
  const name = text('caregiver_name')
  const someone = screenText(langFrom((await cookies()).get('lang')?.value)).field.caregiver // "family member"
  const caregiver = name || relationship || (phone ? someone : '')
  await save({
    preferred_name: text('preferred_name'),
    form_of_address: text('form_of_address'),
    language_preference: SPEECH[Number(form.get('speech') || -1)] ?? DEFAULT_SPEECH, // missing/blank -> default
    address: text('address', 300),
    preferences: lines('preferences'),
    ...medical,
    medical_source: same ? old.medical_source : SELF_REPORTED,
    medical_reviewed_on: same
      ? old.medical_reviewed_on
      : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }), // YYYY-MM-DD
    caregiver: caregiver ? { name: caregiver, relationship: name ? relationship : '', phone } : null,
  })
}

async function save(profile: object) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('save_my_profile', { p_data: profile })
  if (error?.code === 'PT401' || error?.code === '42501') redirect('/login') // not signed in
  if (error) {
    console.error('profile save failed', error)
    redirect('/profile?e=save')
  }
  refresh() // otherwise browser Back shows the old form, and saving that would undo this save
  redirect('/')
}

// The screen-language toggle. Setting a cookie in an action re-renders the page in place, so a running
// conversation keeps going.
export async function setLanguage(form: FormData) {
  const lang = form.get('lang') === 'en' ? 'en' : 'bn'
  ;(await cookies()).set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}
