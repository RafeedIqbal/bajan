'use client'

import { useEffect, useRef, useState } from 'react'
import { text, type Lang } from '@/lib/i18n'
import { LIMITS, MEALS, TIMES, type Meal, type Medication } from '@/lib/profile'
import { PlusIcon, TrashIcon } from '../icons'

// `key` only keeps React's rows stable while editing; saving ignores it. Saved rows are keyed by position, so
// the server and the browser render the same ids.
export type MedicationRow = Medication & { key: string }

let added = 0
export const medicationRow = (m: Partial<Medication> = {}, key = `new-${added++}`): MedicationRow => ({
  name: '',
  dose: '',
  times: [],
  meal: '',
  note: '',
  ...m,
  key,
})

type Props = { lang: Lang; rows: MedicationRow[]; onChange: (rows: MedicationRow[]) => void }

// One card per medicine: name, how much, when (tap the times of day), before or after food, and anything
// else. Posted as JSON in one hidden field.
export default function MedicationList({ lang, rows, onChange }: Props) {
  const t = text(lang)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const full = rows.length >= LIMITS.medications

  useEffect(() => {
    if (focusKey === null) return
    ;(focusKey ? document.getElementById(`med-${focusKey}`) : addButton.current)?.focus()
    setFocusKey(null)
  }, [focusKey])

  const update = (key: string, change: Partial<Medication>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...change } : r)))

  function add() {
    if (full) return
    const row = medicationRow()
    onChange([...rows, row])
    setFocusKey(row.key)
  }

  function remove(key: string) {
    onChange(rows.filter((r) => r.key !== key))
    setFocusKey('') // the add button
  }

  return (
    <div className="item-rows">
      <span className="label">{t.label.medications}</span>
      {rows.map((m, i) => (
        <fieldset key={m.key} className="item-row">
          <legend>{m.name ? `${i + 1}. ${m.name}` : t.med.heading(i + 1)}</legend>
          <div className="fields-2">
            <label>
              {t.med.name}
              <input
                id={`med-${m.key}`}
                type="text"
                maxLength={LIMITS.item}
                autoComplete="off"
                value={m.name}
                onChange={(e) => update(m.key, { name: e.target.value })}
              />
            </label>
            <label>
              {t.med.dose}
              <input type="text" maxLength={100} autoComplete="off" value={m.dose} onChange={(e) => update(m.key, { dose: e.target.value })} />
            </label>
          </div>
          <fieldset className="choice">
            <legend>{t.med.times}</legend>
            <div className="toggle-pills">
              {TIMES.map((time) => (
                <label key={time}>
                  <input
                    type="checkbox"
                    checked={m.times.includes(time)}
                    onChange={(e) =>
                      update(m.key, { times: TIMES.filter((x) => (x === time ? e.target.checked : m.times.includes(x))) })
                    }
                  />
                  <span>{t.times[time]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="choice">
            <legend>{t.med.meal}</legend>
            <div className="toggle-pills">
              {[...MEALS, ''].map((meal) => (
                <label key={meal || 'none'}>
                  <input
                    type="radio"
                    name={`meal-${m.key}`}
                    checked={m.meal === meal}
                    onChange={() => update(m.key, { meal: meal as Meal | '' })}
                  />
                  <span>{meal ? t.meals[meal as Meal] : t.notGiven}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            {t.med.note}
            <input type="text" maxLength={LIMITS.item} autoComplete="off" value={m.note} onChange={(e) => update(m.key, { note: e.target.value })} />
          </label>
          <button type="button" className="ghost remove" onClick={() => remove(m.key)}>
            <TrashIcon />
            {t.med.remove}
          </button>
        </fieldset>
      ))}
      {full ? (
        <p className="hint">{t.med.full}</p>
      ) : (
        <button ref={addButton} type="button" className="tonal" onClick={add}>
          <PlusIcon />
          {t.med.add}
        </button>
      )}
      <input type="hidden" name="medications" value={JSON.stringify(rows)} />
    </div>
  )
}
