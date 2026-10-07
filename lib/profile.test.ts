// Runnable checks for the profile rules shared by the form, the sample and document reading: `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { text } from './i18n.ts'
import {
  ageFrom,
  caregiverFrom,
  cleanBirthYear,
  cleanContacts,
  cleanList,
  cleanMedications,
  cleanNeeds,
  cleanRoutine,
  contactsForModel,
  contactsOf,
  formatMedication,
  LIMITS,
  medicalKey,
  NEEDS,
  ROLES,
  ROUTINE,
  TIMES,
} from './profile.ts'

const NOW = new Date('2026-10-07T12:00:00+06:00')
const t = text('bn')
const roleLabel = (role: (typeof ROLES)[number]) => t.roles[role]

test('lists: trimmed, blanks and repeats dropped, at most 20', () => {
  assert.deepEqual(cleanList([' উচ্চ রক্তচাপ ', '', 'Diabetes', 'diabetes', 42, null]), ['উচ্চ রক্তচাপ', 'Diabetes'])
  assert.equal(cleanList(Array.from({ length: 30 }, (_, i) => `item ${i}`)).length, LIMITS.list)
  assert.deepEqual(cleanList('not a list'), [])
})

test('medicines: fields capped, unknown times and meals dropped, old one-line entries kept as names', () => {
  const [m, old] = cleanMedications([
    { name: ' Metformin 500 mg ', dose: '১টি', times: ['night', 'bogus', 'morning'], meal: 'during', note: 'x'.repeat(500) },
    'Amlodipine 5 mg — ১টি ট্যাবলেট — সকাল ৮টা',
    { dose: 'no name' },
    'not json',
  ])
  assert.deepEqual(m.times, ['morning', 'night']) // known times only, in the day's order
  assert.equal(m.name, 'Metformin 500 mg')
  assert.equal(m.meal, '')
  assert.equal(Array.from(m.note).length, LIMITS.item)
  assert.deepEqual(old, { name: 'Amlodipine 5 mg — ১টি ট্যাবলেট — সকাল ৮টা', dose: '', times: [], meal: '', note: '' })
  assert.equal(cleanMedications([{ dose: 'no name' }]).length, 0)
  assert.equal(cleanMedications(Array.from({ length: 25 }, (_, i) => `m${i}`)).length, LIMITS.medications)
  assert.deepEqual(cleanMedications({ name: 'not a list' }), [])
})

test('medicine lines read the way they are written', () => {
  const line = formatMedication(
    { name: 'Metformin 500 mg', dose: '১টি ট্যাবলেট', times: ['morning', 'night'], meal: 'after', note: '' },
    { times: t.times, meal: t.meals }
  )
  assert.equal(line, 'Metformin 500 mg — ১টি ট্যাবলেট — সকাল, রাত — খাবারের পরে')
})

test('contacts: exactly one is called for help, at most 10, blank rows dropped', () => {
  const contacts = cleanContacts([
    { name: 'করিম', role: 'son', phone: '+8801700000000' },
    { name: '', detail: '', phone: '' },
    { name: 'Dr. Rahman', role: 'doctor', call_for_help: true },
    { name: 'নাসরিন', role: 'aunt', call_for_help: true },
  ])
  assert.equal(contacts.length, 3)
  assert.deepEqual(contacts.map((c) => c.call_for_help), [false, true, false]) // the first one marked
  assert.equal(contacts[2].role, 'other') // unknown roles become "someone else"
  assert.deepEqual(cleanContacts([{ name: 'A' }, { name: 'B' }]).map((c) => c.call_for_help), [true, false]) // none marked
  assert.equal(cleanContacts(Array.from({ length: 12 }, (_, i) => ({ name: `c${i}` }))).length, LIMITS.contacts)
  assert.equal(cleanContacts([{ phone: '1'.repeat(50) }])[0].phone.length, 30)
})

test('the caregiver the calling flow reads comes from the call-for-help contact', () => {
  const someone = t.field.caregiver
  const son = cleanContacts([{ name: 'করিম', role: 'son', phone: '+880', call_for_help: true }])
  assert.deepEqual(caregiverFrom(son, roleLabel, someone), { name: 'করিম', relationship: 'ছেলে', phone: '+880' })
  // As before: a relationship or a number alone still names someone to call.
  assert.deepEqual(caregiverFrom(cleanContacts([{ role: 'daughter', phone: '1' }]), roleLabel, someone), { name: 'মেয়ে', relationship: '', phone: '1' })
  assert.deepEqual(caregiverFrom(cleanContacts([{ role: 'other', phone: '1' }]), roleLabel, someone), { name: someone, relationship: '', phone: '1' })
  assert.equal(caregiverFrom([], roleLabel, someone), null)
})

test('profiles from before contacts existed: the caregiver becomes the one contact', () => {
  assert.deepEqual(contactsOf({ caregiver: { name: 'করিম', relationship: 'ছেলে', phone: '+880' } }), [
    { name: 'করিম', role: 'other', detail: 'ছেলে', phone: '+880', call_for_help: true },
  ])
  assert.deepEqual(contactsOf({ caregiver: null }), [])
  assert.deepEqual(contactsOf({}), [])
})

test('Gemini never gets a contact phone number', () => {
  const contacts = contactsOf({ contacts: [{ name: 'করিম', role: 'son', detail: '', phone: '+8801700000000', call_for_help: true }] })
  assert.ok(!JSON.stringify(contactsForModel(contacts)).includes('+880'))
})

test('birth year: Bangla or ASCII digits, 1900 to this year; age from it', () => {
  assert.equal(cleanBirthYear('১৯৫২', NOW), 1952)
  assert.equal(cleanBirthYear(' 1952 ', NOW), 1952)
  assert.equal(cleanBirthYear(1952, NOW), 1952)
  for (const bad of ['1899', '2027', '52', '19৫x', '', null, 1952.5]) assert.equal(cleanBirthYear(bad, NOW), null, String(bad))
  assert.equal(ageFrom(1952, NOW), 74)
  assert.equal(ageFrom(null, NOW), null)
  assert.equal(t.age(74), 'প্রায় ৭৪ বছর')
})

test('needs and routine keep only valid, filled-in entries', () => {
  assert.deepEqual(cleanNeeds((k) => (k === 'hearing' ? ' কানে কম শোনেন ' : '')), { hearing: 'কানে কম শোনেন' })
  const routine = { wake: '06:00', breakfast: '7:30', lunch: '24:00', dinner: '20:00', sleep: undefined }
  assert.deepEqual(cleanRoutine((k) => routine[k]), { wake: '06:00', dinner: '20:00' })
  assert.equal(t.clockTime('05:30'), 'ভোর ৫:৩০')
  assert.equal(t.clockTime('06:00'), 'সকাল ৬:০০')
  assert.equal(t.clockTime('20:30'), 'রাত ৮:৩০')
  assert.equal(text('en').clockTime('13:05'), '1:05 pm')
})

test('re-saving old one-line medicines does not count as a medical change', () => {
  const old = { conditions: ['HTN'], allergies: [], medications: ['Metformin 500 mg'] }
  assert.equal(medicalKey(old), medicalKey({ ...old, medications: cleanMedications(old.medications) }))
  assert.notEqual(medicalKey(old), medicalKey({ ...old, allergies: ['Penicillin'] }))
})

test('a profile with every field full fits the database cap (50,000 characters)', () => {
  const long = (n: number) => 'ক'.repeat(n)
  const full = {
    preferred_name: long(200),
    form_of_address: long(200),
    language_preference: 'bangla_preferred',
    birth_year: 1952,
    gender: 'female',
    blood_group: 'AB+',
    address: long(300),
    preferences: cleanList(Array.from({ length: 20 }, (_, i) => `${i}${long(198)}`)),
    needs: cleanNeeds(() => long(200)),
    routine: cleanRoutine(() => '23:59'),
    conditions: cleanList(Array.from({ length: 20 }, (_, i) => `${i}${long(198)}`)),
    allergies: cleanList(Array.from({ length: 20 }, (_, i) => `${i}${long(198)}`)),
    medications: cleanMedications(
      Array.from({ length: 20 }, () => ({ name: long(200), dose: long(100), times: [...TIMES], meal: 'before', note: long(200) }))
    ),
    medical_source: long(200),
    medical_reviewed_on: '2026-10-07',
    contacts: cleanContacts(Array.from({ length: 10 }, () => ({ name: long(200), role: 'neighbour', detail: long(200), phone: '9'.repeat(30) }))),
    caregiver: { name: long(200), relationship: long(200), phone: '9'.repeat(30) },
  }
  assert.equal(Object.keys(full.needs).length, NEEDS.length)
  assert.equal(Object.keys(full.routine).length, ROUTINE.length)
  const size = JSON.stringify(full).length // what Postgres's length(jsonb::text) counts, give or take spacing
  assert.ok(size < 45000, `full profile is ${size} characters`)
})
