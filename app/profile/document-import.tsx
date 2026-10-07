'use client'

import { useRef, useState } from 'react'
import { text, type Lang } from '@/lib/i18n'
import { formatMedication, type Medication } from '@/lib/profile'
import { CameraIcon, FileIcon, Spinner } from '../icons'

export type Found = { conditions: string[]; allergies: string[]; medications: Medication[] }

const MAX_FILES = 5
const MAX_BYTES = 4 * 1024 * 1024 // as /api/extract
const MAX_EDGE = 2000 // px: enough for handwriting, small enough for phone data

type Pick = { group: keyof Found; index: number; label: string; listed: boolean }

// Reads a prescription or report photo (or PDF) through /api/extract and shows what was found as a checklist.
// Nothing is added until the user picks it; items already on the profile start unticked.
export default function DocumentImport({ lang, current, onAdd }: { lang: Lang; current: Found; onAdd: (found: Found) => void }) {
  const t = text(lang)
  const photo = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  const picks = (f: Found): Pick[] => [
    ...f.conditions.map((c, index) => ({ group: 'conditions' as const, index, label: c, listed: current.conditions.some((x) => same(x, c)) })),
    ...f.allergies.map((a, index) => ({ group: 'allergies' as const, index, label: a, listed: current.allergies.some((x) => same(x, a)) })),
    ...f.medications.map((m, index) => ({
      group: 'medications' as const,
      index,
      label: formatMedication(m, { times: t.times, meal: t.meals }),
      listed: current.medications.some((x) => same(x.name, m.name)),
    })),
  ]
  const id = (p: Pick) => `${p.group}-${p.index}`

  async function read(files: FileList | null) {
    if (!files?.length || reading) return
    setError('')
    setStatus('')
    setFound(null)
    if (files.length > MAX_FILES) return setError(t.importer.errors.too_many)
    setReading(true)
    try {
      const body = new FormData()
      let total = 0
      for (const f of Array.from(files)) {
        const page = await shrink(f)
        total += page.size
        body.append('file', page)
      }
      if (total > MAX_BYTES) return setError(t.importer.errors.too_large)
      const response = await fetch('/api/extract', { method: 'POST', body })
      const data = await response.json().catch(() => null)
      if (response.status === 401) return setError(t.importer.errors.signed_out)
      if (!response.ok) return setError(t.importer.errors[data?.error] ?? t.importer.errors.failed)
      const result = data as Found
      setFound(result)
      setPicked(new Set(picks(result).filter((p) => !p.listed).map(id)))
    } catch {
      setError(t.importer.errors.failed)
    } finally {
      setReading(false)
      for (const input of [photo.current, file.current]) if (input) input.value = '' // the same file can be read again
    }
  }

  function addPicked() {
    if (!found) return
    const take = <T,>(group: keyof Found, items: T[]) => items.filter((_, index) => picked.has(`${group}-${index}`))
    const chosen = {
      conditions: take('conditions', found.conditions),
      allergies: take('allergies', found.allergies),
      medications: take('medications', found.medications),
    }
    onAdd(chosen)
    setFound(null)
    setStatus(t.importer.added(picked.size))
  }

  const toggle = (key: string) =>
    setPicked((now) => {
      const next = new Set(now)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const all = found ? picks(found) : []
  const groups = (['conditions', 'allergies', 'medications'] as const).filter((g) => all.some((p) => p.group === g))
  return (
    <div className="import">
      <p className="label">{t.importer.title}</p>
      <p className="hint">{t.importer.text}</p>
      <div className="row">
        <button type="button" className="tonal" aria-disabled={reading || undefined} onClick={() => reading || photo.current?.click()}>
          <CameraIcon />
          {t.importer.photo}
        </button>
        <button type="button" className="tonal" aria-disabled={reading || undefined} onClick={() => reading || file.current?.click()}>
          <FileIcon />
          {t.importer.file}
        </button>
      </div>
      {/* No name: the files go to /api/extract only, never with the profile form. */}
      <input ref={photo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => read(e.target.files)} />
      <input ref={file} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => read(e.target.files)} />
      <p className="note">{t.importer.note}</p>

      <p role="status" className="import-status">
        {reading && (
          <>
            <Spinner />
            {t.importer.reading}
          </>
        )}
        {!reading && status}
      </p>
      <p role="alert">{error}</p>

      {found && (
        <div className="import-review">
          <p className="label">{t.importer.found}</p>
          {all.every((p) => p.listed) && <p className="hint">{t.importer.nothingNew}</p>}
          {groups.map((group) => (
            <fieldset key={group} className="choice">
              <legend>{t.label[group]}</legend>
              {all
                .filter((p) => p.group === group)
                .map((p) => (
                  <label key={id(p)} className="check-row">
                    <input type="checkbox" checked={picked.has(id(p))} onChange={() => toggle(id(p))} />
                    <span>
                      {p.label}
                      {p.listed && <span className="pill">{t.importer.already}</span>}
                    </span>
                  </label>
                ))}
            </fieldset>
          ))}
          <div className="row">
            <button type="button" className="primary" aria-disabled={picked.size === 0 || undefined} onClick={() => picked.size && addPicked()}>
              {t.importer.addSelected}
            </button>
            <button type="button" onClick={() => setFound(null)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Phone photos are 3–12 MB: re-encode as a JPEG at most MAX_EDGE px on its long side (this also drops
// EXIF data such as the location). A PDF, or an image this browser cannot decode (HEIC in Chrome), is sent
// as it is; the server checks its type and size.
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && file.type !== '') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ? new File([blob], 'page.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}
