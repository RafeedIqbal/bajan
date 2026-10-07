// The profile's shape and the rules every write goes through: the form, the sample profile and fields read
// from a document photo. The database stores whatever object the app sends (save_my_profile only caps its
// size), so this file is the schema. Every field is optional: onboarding lets users skip any of them.

export const GENDERS = ['female', 'male', 'other'] as const
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
export const ROLES = ['son', 'daughter', 'spouse', 'relative', 'caregiver', 'doctor', 'neighbour', 'other'] as const
export const TIMES = ['morning', 'noon', 'evening', 'night'] as const
export const MEALS = ['before', 'after'] as const
export const NEEDS = ['hearing', 'eyesight', 'mobility'] as const
export const ROUTINE = ['wake', 'breakfast', 'lunch', 'dinner', 'sleep'] as const

export type Gender = (typeof GENDERS)[number]
export type BloodGroup = (typeof BLOOD_GROUPS)[number]
export type Role = (typeof ROLES)[number]
export type Time = (typeof TIMES)[number]
export type Meal = (typeof MEALS)[number]
export type Need = (typeof NEEDS)[number]
export type RoutineKey = (typeof ROUTINE)[number]

// `note` holds what doesn't fit the fields: exact clock times, "as needed", how many days.
export type Medication = { name: string; dose: string; times: Time[]; meal: Meal | ''; note: string }
// Exactly one contact (when there are any) is the person Bajan and the Help button call.
export type Contact = { name: string; role: Role; detail: string; phone: string; call_for_help: boolean }
export type Caregiver = { name: string; relationship: string; phone: string }

export type Profile = {
  preferred_name?: string
  form_of_address?: string
  language_preference?: string
  birth_year?: number | null
  gender?: Gender | ''
  blood_group?: BloodGroup | ''
  address?: string
  preferences?: string[]
  needs?: Partial<Record<Need, string>>
  routine?: Partial<Record<RoutineKey, string>>
  conditions?: string[]
  allergies?: string[]
  medications?: (Medication | string)[] // strings: saved before medicines had separate fields
  medical_source?: string
  medical_reviewed_on?: string
  contacts?: Contact[]
  // The call-for-help contact, kept under its old key for the calling flow (request_help reads its name).
  caregiver?: Caregiver | null
}

export const LIMITS = { list: 20, item: 200, medications: 20, contacts: 10 }

// Cut by code points: a String.slice cut can split an emoji, which PostgREST rejects as invalid JSON.
export const cap = (s: string, n: number) => Array.from(s).slice(0, n).join('')

const str = (v: unknown, max = LIMITS.item) => (typeof v === 'string' ? cap(v.trim().replace(/\s+/g, ' '), max) : '')
const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T)
const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

// Typed Bangla digits (১৯৫২) are as valid as ASCII ones.
export const asciiDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))

// Blank items dropped, repeats (ignoring case) dropped, at most 20.
export function cleanList(v: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of Array.isArray(v) ? v : []) {
    const s = str(item)
    if (!s || seen.has(s.toLowerCase())) continue
    seen.add(s.toLowerCase())
    out.push(s)
  }
  return out.slice(0, LIMITS.list)
}

// Also reads the old one-line entries ("Metformin 500 mg — সকাল ৮টা") as a medicine with just a name.
export function cleanMedications(v: unknown): Medication[] {
  const out: Medication[] = []
  for (const item of Array.isArray(v) ? v : []) {
    const m = typeof item === 'string' ? { name: item } : record(item)
    const name = str(m.name)
    if (!name) continue
    const times = Array.isArray(m.times) ? m.times : []
    out.push({
      name,
      dose: str(m.dose, 100),
      times: TIMES.filter((t) => times.includes(t)),
      meal: isOneOf(MEALS, m.meal) ? m.meal : '',
      note: str(m.note),
    })
  }
  return out.slice(0, LIMITS.medications)
}

// A number alone still names someone to call, so only fully blank rows are dropped. The first contact
// marked call_for_help keeps the mark; with none marked, the first contact gets it.
export function cleanContacts(v: unknown): Contact[] {
  const out: Contact[] = []
  for (const item of Array.isArray(v) ? v : []) {
    const c = record(item)
    const contact: Contact = {
      name: str(c.name),
      role: isOneOf(ROLES, c.role) ? c.role : 'other',
      detail: str(c.detail),
      phone: str(c.phone, 30),
      call_for_help: c.call_for_help === true,
    }
    if (contact.name || contact.detail || contact.phone) out.push(contact)
  }
  const contacts = out.slice(0, LIMITS.contacts)
  const chosen = Math.max(0, contacts.findIndex((c) => c.call_for_help))
  return contacts.map((c, i) => ({ ...c, call_for_help: i === chosen }))
}

// A profile saved before contacts existed has only `caregiver`: it becomes the one contact, called for help.
export function contactsOf(p: Profile | null | undefined): Contact[] {
  if (Array.isArray(p?.contacts)) return cleanContacts(p.contacts)
  const c = p?.caregiver
  if (!c?.name) return []
  return cleanContacts([{ name: c.name, role: 'other', detail: c.relationship, phone: c.phone, call_for_help: true }])
}

// The call-for-help contact in the shape the calling flow reads. As before, a relationship or a number
// alone still names someone to call ("ছেলে-কে ফোন করব?"); `someone` is the word for "family member".
export function caregiverFrom(contacts: Contact[], roleLabel: (role: Role) => string, someone: string): Caregiver | null {
  const c = contacts.find((c) => c.call_for_help)
  if (!c) return null
  const relationship = c.role === 'other' ? c.detail : roleLabel(c.role)
  const name = c.name || relationship || (c.phone ? someone : '')
  return name ? { name, relationship: c.name ? relationship : '', phone: c.phone } : null
}

// Only the fields a conversation can use: phone numbers never go to Gemini.
export const contactsForModel = (contacts: Contact[]) =>
  contacts.map(({ name, role, detail, call_for_help }) => ({ name, role, detail, call_for_help }))

export const dhakaYear = (now = new Date()) =>
  Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dhaka', year: 'numeric' }).format(now))

export function cleanBirthYear(v: unknown, now = new Date()): number | null {
  const year = typeof v === 'number' ? v : typeof v === 'string' ? Number(asciiDigits(v.trim()) || NaN) : NaN
  return Number.isInteger(year) && year >= 1900 && year <= dhakaYear(now) ? year : null
}

export function ageFrom(birthYear: unknown, now = new Date()): number | null {
  const year = cleanBirthYear(birthYear, now)
  return year === null ? null : dhakaYear(now) - year
}

export const cleanGender = (v: unknown): Gender | '' => (isOneOf(GENDERS, v) ? v : '')
export const cleanBloodGroup = (v: unknown): BloodGroup | '' => (isOneOf(BLOOD_GROUPS, v) ? v : '')

// Only the filled-in entries are kept, so an untouched section adds nothing to the profile.
export function cleanNeeds(get: (key: Need) => unknown): Partial<Record<Need, string>> {
  return Object.fromEntries(NEEDS.map((k) => [k, str(get(k))]).filter(([, v]) => v))
}

// 24-hour 'HH:MM', which is what <input type="time"> sends.
export function cleanRoutine(get: (key: RoutineKey) => unknown): Partial<Record<RoutineKey, string>> {
  const time = (v: unknown) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : '')
  return Object.fromEntries(ROUTINE.map((k) => [k, time(get(k))]).filter(([, v]) => v))
}

// What counts as "the medical details" when deciding whether their source label still holds.
export const medicalKey = (p: Profile | null | undefined) =>
  JSON.stringify([cleanList(p?.conditions), cleanList(p?.allergies), cleanMedications(p?.medications)])

// One line per medicine for reading, e.g. "Metformin 500 mg — ১টি ট্যাবলেট — সকাল, রাত — খাবারের পরে".
export function formatMedication(m: Medication, labels: { times: Record<Time, string>; meal: Record<Meal, string> }) {
  const times = m.times.map((t) => labels.times[t]).join(', ')
  return [m.name, m.dose, times, m.meal && labels.meal[m.meal], m.note].filter(Boolean).join(' — ')
}
