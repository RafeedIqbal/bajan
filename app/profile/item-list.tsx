'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { text, type Lang } from '@/lib/i18n'
import { LIMITS } from '@/lib/profile'
import { CheckIcon, CloseIcon, PlusIcon } from '../icons'

type Props = {
  name: string // each chip posts as one value of this form field
  label: string
  lang: Lang
  placeholder?: string
  suggestions?: string[]
  // Controlled (the health editor, which the document reader also adds to), or starting from `initial`.
  items?: string[]
  onChange?: (items: string[]) => void
  initial?: string[]
}

const tidy = (s: string) => s.trim().replace(/\s+/g, ' ')

// A short list (conditions, allergies, likes) as removable chips, typed one at a time or picked from
// suggestions with one tap. The text box posts under the same name, so a word typed but never added is
// still saved.
export default function ItemList({ name, label, lang, placeholder, suggestions = [], items, onChange, initial = [] }: Props) {
  const t = text(lang)
  const [own, setOwn] = useState(initial)
  const list = items ?? own
  const setList = onChange ?? setOwn
  const [draft, setDraft] = useState('')
  const [said, setSaid] = useState('') // read out by screen readers
  const input = useRef<HTMLInputElement>(null)
  const chips = useRef(new Map<string, HTMLButtonElement>())
  const [focusAfter, setFocusAfter] = useState<string | null>(null) // a chip, or '' for the text box
  const id = useId()
  const has = (s: string) => list.some((x) => x.toLowerCase() === s.toLowerCase())
  const full = list.length >= LIMITS.list

  // After a removal, focus the neighbouring chip, so it neither drops to the page nor opens the keyboard.
  useEffect(() => {
    if (focusAfter === null) return
    ;(chips.current.get(focusAfter) ?? input.current)?.focus()
    setFocusAfter(null)
  }, [focusAfter])

  function add(value: string) {
    const item = tidy(value)
    if (item && !full && !has(item)) {
      setList([...list, item])
      setSaid(t.list.added(item))
    }
  }

  function remove(item: string, refocus: boolean) {
    const i = list.indexOf(item)
    setList(list.filter((x) => x !== item))
    setSaid(t.list.removed(item))
    if (refocus) setFocusAfter(list[i + 1] ?? list[i - 1] ?? '')
  }

  const addDraft = () => {
    add(draft)
    setDraft('')
  }

  return (
    <div className="item-list">
      <label htmlFor={id}>{label}</label>
      {list.length > 0 && (
        <ul className="chips">
          {list.map((item) => (
            <li key={item} className="chip">
              <span>{item}</span>
              <button
                ref={(el) => {
                  if (el) chips.current.set(item, el)
                  else chips.current.delete(item)
                }}
                type="button"
                className="chip-remove"
                aria-label={t.list.remove(item)}
                onClick={() => remove(item, true)}
              >
                <CloseIcon />
              </button>
              <input type="hidden" name={name} value={item} />
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="hint">{t.list.full}</p>
      ) : (
        <div className="add-row">
          <input
            ref={input}
            id={id}
            type="text"
            name={name}
            maxLength={LIMITS.item}
            autoComplete="off"
            enterKeyHint="done"
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
              e.preventDefault() // Enter adds the item instead of submitting the whole profile
              addDraft()
            }}
          />
          <button type="button" className="tonal" onClick={addDraft}>
            <PlusIcon />
            {t.list.add}
          </button>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="suggestions">
          <span className="hint">{t.list.suggestions}:</span>
          {suggestions.map((s) => {
            const on = has(s)
            return (
              <button
                key={s}
                type="button"
                className="suggestion"
                aria-pressed={on}
                aria-disabled={(!on && full) || undefined}
                onClick={() => (on ? remove(list.find((x) => x.toLowerCase() === s.toLowerCase())!, false) : add(s))}
              >
                {on ? <CheckIcon /> : <PlusIcon />}
                {s}
              </button>
            )
          })}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  )
}
