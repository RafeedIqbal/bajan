'use client'

import { useEffect, useRef, useState } from 'react'
import { text, type Lang } from '@/lib/i18n'
import { LIMITS, ROLES, type Contact, type Role } from '@/lib/profile'
import { PlusIcon, TrashIcon } from '../icons'

type Row = Contact & { key: string } // `key` as in medication-list: saved rows by position, new ones counted

let added = 0

// Family, doctors and caregivers, one card each. Exactly one is the person Bajan and the Help button call:
// the first contact added is chosen until another one is. Posted as JSON in one hidden field.
export default function ContactList({ lang, initial }: { lang: Lang; initial: Contact[] }) {
  const t = text(lang)
  const [rows, setRows] = useState<Row[]>(() => initial.map((c, i) => ({ ...c, key: `saved-${i}` })))
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const full = rows.length >= LIMITS.contacts

  useEffect(() => {
    if (focusKey === null) return
    ;(focusKey ? document.getElementById(`contact-${focusKey}`) : addButton.current)?.focus()
    setFocusKey(null)
  }, [focusKey])

  const update = (key: string, change: Partial<Contact>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...change } : r)))
  const choose = (key: string) => setRows(rows.map((r) => ({ ...r, call_for_help: r.key === key })))

  function add() {
    if (full) return
    const row: Row = { name: '', role: 'other', detail: '', phone: '', call_for_help: rows.length === 0, key: `new-${added++}` }
    setRows([...rows, row])
    setFocusKey(row.key)
  }

  function remove(key: string) {
    const left = rows.filter((r) => r.key !== key)
    // Removing the person called for help passes the role to the first one left.
    setRows(left.some((r) => r.call_for_help) ? left : left.map((r, i) => ({ ...r, call_for_help: i === 0 })))
    setFocusKey('')
  }

  return (
    <div className="item-rows">
      <p className="hint">{t.contact.intro}</p>
      {rows.length === 0 && <p className="note-box">{t.contact.empty}</p>}
      {rows.map((c, i) => (
        <fieldset key={c.key} className="item-row" data-chosen={c.call_for_help || undefined}>
          <legend>{c.name ? `${i + 1}. ${c.name}` : t.contact.heading(i + 1)}</legend>
          <div className="fields-2">
            <label>
              {t.contact.name}
              <input
                id={`contact-${c.key}`}
                type="text"
                maxLength={LIMITS.item}
                autoComplete="off"
                value={c.name}
                onChange={(e) => update(c.key, { name: e.target.value })}
              />
            </label>
            <label>
              {t.contact.role}
              <select value={c.role} onChange={(e) => update(c.key, { role: e.target.value as Role })}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t.roles[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t.contact.detail}
            <input type="text" maxLength={LIMITS.item} autoComplete="off" value={c.detail} onChange={(e) => update(c.key, { detail: e.target.value })} />
          </label>
          <label>
            {t.contact.phone}
            <input type="tel" maxLength={30} autoComplete="off" value={c.phone} onChange={(e) => update(c.key, { phone: e.target.value })} />
          </label>
          <label className="check-row">
            <input type="radio" name="call_for_help" checked={c.call_for_help} onChange={() => choose(c.key)} />
            <span>{t.contact.callForHelp}</span>
          </label>
          <button type="button" className="ghost remove" onClick={() => remove(c.key)}>
            <TrashIcon />
            {t.contact.remove}
          </button>
        </fieldset>
      ))}
      {full ? (
        <p className="hint">{t.contact.full}</p>
      ) : (
        <button ref={addButton} type="button" className="tonal" onClick={add}>
          <PlusIcon />
          {t.contact.add}
        </button>
      )}
      <input type="hidden" name="contacts" value={JSON.stringify(rows)} />
    </div>
  )
}
