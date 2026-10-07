'use client'

import { useState } from 'react'
import { text, type Lang } from '@/lib/i18n'
import type { Medication } from '@/lib/profile'
import DocumentImport, { type Found } from './document-import'
import ItemList from './item-list'
import MedicationList, { medicationRow, type MedicationRow } from './medication-list'

type Props = { lang: Lang; conditions: string[]; allergies: string[]; medications: Medication[] }

// Conditions, allergies and medicines share one state, so details read from a document land in all three.
// Once anything came from a document, the saved details are labelled as read from one.
export default function HealthEditor({ lang, ...saved }: Props) {
  const t = text(lang)
  const [conditions, setConditions] = useState(saved.conditions)
  const [allergies, setAllergies] = useState(saved.allergies)
  const [medications, setMedications] = useState<MedicationRow[]>(() => saved.medications.map((m, i) => medicationRow(m, `saved-${i}`)))
  const [fromDocument, setFromDocument] = useState(false)

  function add(found: Found) {
    const fresh = (list: string[], items: string[]) => [...list, ...items.filter((x) => !list.some((y) => y.toLowerCase() === x.toLowerCase()))]
    setConditions(fresh(conditions, found.conditions).slice(0, 20))
    setAllergies(fresh(allergies, found.allergies).slice(0, 20))
    setMedications([...medications, ...found.medications.map((m) => medicationRow(m))].slice(0, 20))
    setFromDocument(true)
  }

  return (
    <>
      <DocumentImport lang={lang} current={{ conditions, allergies, medications }} onAdd={add} />
      <ItemList
        name="conditions"
        label={t.label.conditions}
        lang={lang}
        placeholder={t.placeholders.conditions}
        suggestions={t.suggestions.conditions}
        items={conditions}
        onChange={setConditions}
      />
      <ItemList
        name="allergies"
        label={t.label.allergies}
        lang={lang}
        placeholder={t.placeholders.allergies}
        suggestions={t.suggestions.allergies}
        items={allergies}
        onChange={setAllergies}
      />
      <MedicationList lang={lang} rows={medications} onChange={setMedications} />
      {fromDocument && <input type="hidden" name="from_document" value="1" />}
    </>
  )
}
