'use client'

import { useId, useState } from 'react'
import { text, type Lang } from '@/lib/i18n'
import { ageFrom } from '@/lib/profile'

// The birth year, with the age it gives shown as it is typed (Bangla or ASCII digits).
export default function BirthYear({ lang, initial }: { lang: Lang; initial: string }) {
  const t = text(lang)
  const [value, setValue] = useState(initial)
  const id = useId()
  const age = ageFrom(value)
  const typed = value.trim().length >= 4
  return (
    <label>
      {t.label.birthYear}
      <input
        type="text"
        name="birth_year"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        value={value}
        aria-describedby={id}
        onChange={(e) => setValue(e.target.value)}
      />
      <span id={id} className="hint" aria-live="polite">
        {typed ? (age === null ? t.badYear : t.age(age)) : ' '}
      </span>
    </label>
  )
}
