'use client'

import { useState } from 'react'

// The 5-point spoken-language setting. A native range input; this small client part only keeps the
// visible label and the screen-reader text (aria-valuetext) in step with the thumb.
export default function LanguageSlider({ label, scale, initial }: { label: string; scale: string[]; initial: number }) {
  const [value, setValue] = useState(initial)
  return (
    <label>
      {label}: <strong>{scale[value]}</strong>
      <input
        type="range"
        name="speech"
        min={0}
        max={scale.length - 1}
        step={1}
        value={value}
        aria-valuetext={scale[value]}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <span className="scale-ends" aria-hidden="true">
        <span>{scale[0]}</span>
        <span>{scale[scale.length - 1]}</span>
      </span>
    </label>
  )
}
