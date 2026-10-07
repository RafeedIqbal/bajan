import { GoogleGenAI } from '@google/genai'
import { cookies } from 'next/headers'
import { langFrom, type Lang } from '@/lib/i18n'
import { cleanList, cleanMedications, MEALS, TIMES } from '@/lib/profile'
import { requireUser } from '@/lib/supabase'

const MODEL = 'gemini-3.8-flash' // JSON-schema output smoke-tested 2026-10-07
const MAX_FILES = 5
const MAX_BYTES = 4 * 1024 * 1024 // Vercel Functions take request bodies up to 4.5 MB
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

const SCHEMA = {
  type: 'object',
  properties: {
    is_medical: { type: 'boolean' },
    conditions: { type: 'array', items: { type: 'string' } },
    allergies: { type: 'array', items: { type: 'string' } },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          dose: { type: 'string' },
          times: { type: 'array', items: { type: 'string', enum: [...TIMES] } },
          meal: { type: 'string', enum: [...MEALS, ''] },
          note: { type: 'string' },
        },
        required: ['name', 'dose', 'times', 'meal', 'note'],
      },
    },
  },
  required: ['is_medical', 'conditions', 'allergies', 'medications'],
}

// Reads photos, scans or a PDF of a prescription or medical report into profile fields, which the profile
// page shows for the user to check and pick from. Nothing is stored: the files live only in this request's
// memory and their contents are never logged. Works before a profile exists (onboarding).
// ponytail: no per-user throttle, like the token route; the Gemini budget alert is the spending cap.
export async function POST(request: Request) {
  const gate = await requireUser(request)
  if (gate instanceof Response) return gate

  const form = await request.formData().catch(() => null)
  const files = form?.getAll('file').filter((f): f is File => f instanceof File) ?? []
  if (files.length < 1) return Response.json({ error: 'bad_request' }, { status: 400 })
  if (files.length > MAX_FILES) return Response.json({ error: 'too_many' }, { status: 400 })
  if (files.some((f) => !TYPES.includes(f.type))) return Response.json({ error: 'unsupported' }, { status: 415 })
  if (files.reduce((n, f) => n + f.size, 0) > MAX_BYTES) return Response.json({ error: 'too_large' }, { status: 413 })

  const lang = langFrom((await cookies()).get('lang')?.value)
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  let found
  try {
    const pages = await Promise.all(
      files.map(async (f) => ({ inlineData: { mimeType: f.type, data: Buffer.from(await f.arrayBuffer()).toString('base64') } }))
    )
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: instruction(lang) }, ...pages] }],
      config: { responseMimeType: 'application/json', responseJsonSchema: SCHEMA, temperature: 0 },
    })
    found = JSON.parse(response.text ?? '')
  } catch (e) {
    console.error('document reading failed', e instanceof Error ? e.message : 'unknown error')
    return Response.json({ error: 'failed' }, { status: 502 })
  }

  // The same caps and allowed values as typed input.
  const result = {
    conditions: cleanList(found?.conditions),
    allergies: cleanList(found?.allergies),
    medications: cleanMedications(found?.medications),
  }
  const empty = !result.conditions.length && !result.allergies.length && !result.medications.length
  if (found?.is_medical !== true || empty) return Response.json({ error: 'unreadable' }, { status: 422 })
  return Response.json(result)
}

function instruction(lang: Lang) {
  const language = lang === 'en' ? 'English' : 'Bangladeshi Bangla'
  return `These pages are a photo, scan or PDF of a medical document from Bangladesh: a prescription, discharge summary, test report or doctor's note. Read it into an older person's health profile. A family member checks every item before anything is saved.

- Take only what is written. If something is too unclear to read with confidence, leave it out. Never guess a medicine, a strength or a schedule.
- conditions: the diagnoses or health problems written on it, in plain words, with standard abbreviations spelled out (HTN: high blood pressure, DM: diabetes, IHD: heart disease, CKD: kidney disease, COPD, OA: arthritis).
- allergies: only allergies the document states.
- medications: each medicine prescribed, one entry each.
  - name: the medicine name and strength exactly as written, in the same letters (e.g. "Napa 500 mg", "Seclo 20 mg"), without the form prefix (Tab., Cap., Syp., Inj.).
  - dose: how much each time, e.g. "1 tablet", "½ tablet", "2 teaspoons", "10 units".
  - times: Bangladeshi prescriptions write the schedule as counts for morning + midday + night: "1+0+1", "১+০+১" or "1-0-1" is morning and night, "0+0+1" is night only, "1+1+1" is morning, midday and night. Four numbers are morning + midday + evening + night. The count is the dose ("½+0+½" is half a tablet). Use evening only when it is written. Leave times empty when no schedule is written.
  - meal: "before" for খাবারের আগে, before meal, a.c. or empty stomach; "after" for খাবারের পরে, after meal or p.c.; otherwise "".
  - note: anything else written for that medicine: exact clock times, how long to take it (e.g. "30 days", "continue"), "as needed", where to apply it. "" if nothing.
- Write conditions, allergies, dose and note in ${language}. Keep medicine names as written.
- Leave out the patient's and doctor's names, tests to do, and advice that is not a medicine.
- is_medical: false if this is not a medical document or nothing in it could be read.`
}
