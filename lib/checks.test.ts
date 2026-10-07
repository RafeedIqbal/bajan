// Runnable checks for the non-trivial client logic: `npm test` (node:test, no dependencies).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { MediaModality } from '@google/genai'
import { labelAt, text } from './i18n.ts'
import { addUsage, appendTranscript, closeTranscript, newEntry, ZERO_USAGE } from './live.ts'
import { matchesWakeWord } from './wake.ts'

test('wake word: বাজান in its spoken and transcribed forms', () => {
  for (const text of ['বাজান', 'বা জান', 'বা\u200Cজান', 'এই বাজান?', 'ও বাজান, শুনছেন']) {
    assert.ok(matchesWakeWord(text), text)
  }
})

test('wake word: near misses do not start a session', () => {
  for (const text of ['বাজানো', 'গান বাজানোর সময়', 'বা জানে', 'বাজানের', 'বাজনা', 'বা']) {
    assert.ok(!matchesWakeWord(text), text)
  }
})

test('wake word: an interim transcript only counts once the name is complete', () => {
  assert.ok(matchesWakeWord('বাজান, শুনছেন', false))
  assert.ok(matchesWakeWord('ও বাজান ', false))
  for (const text of ['বাজান', 'আমার বা জান', 'বাজানো']) assert.ok(!matchesWakeWord(text, false), text)
})

test('usage: each modality at its own price, thinking as text output, summed per message', () => {
  const million = (modality: MediaModality) => ({ modality, tokenCount: 1_000_000 })
  const message = {
    promptTokenCount: 2_000_000,
    promptTokensDetails: [million(MediaModality.AUDIO), million(MediaModality.TEXT)],
    toolUsePromptTokensDetails: [million(MediaModality.TEXT)],
    responseTokenCount: 2_000_000,
    responseTokensDetails: [million(MediaModality.AUDIO), million(MediaModality.TEXT)],
    thoughtsTokenCount: 1_000_000,
  }
  const once = addUsage(ZERO_USAGE, message)
  assert.deepEqual(once, { audioIn: 1e6, textIn: 2e6, audioOut: 1e6, textOut: 2e6, usd: 3 + 0.75 + 0.75 + 12 + 4.5 + 4.5 })
  assert.equal(addUsage(once, message).usd, 2 * once.usd)
  assert.deepEqual(ZERO_USAGE, { audioIn: 0, textIn: 0, audioOut: 0, textOut: 0, usd: 0 }, 'totals are not mutated')
})

test('usage: tokens the modality details leave out still count (as text)', () => {
  // Shape seen from gemini-3.8-live: promptTokenCount 1490 but details list only 1175 text + 244 audio.
  const t = addUsage(ZERO_USAGE, {
    promptTokenCount: 1490,
    promptTokensDetails: [{ modality: MediaModality.TEXT, tokenCount: 1175 }, { modality: MediaModality.AUDIO, tokenCount: 244 }],
    responseTokenCount: 133,
    responseTokensDetails: [{ modality: MediaModality.AUDIO, tokenCount: 133 }],
    thoughtsTokenCount: 128,
  })
  assert.equal(t.textIn + t.audioIn, 1490)
  assert.equal(t.audioOut + t.textOut, 133 + 128)
})

test('transcript: late words join their own line, interruptions cut only Bajan, turns close both', () => {
  let list = appendTranscript([], 'user', 'আমার রাতের')
  list = appendTranscript(list, 'bajan', 'আপনার রাতের ওষুধ')
  list = appendTranscript(list, 'user', ' ওষুধ কী?') // input transcription trailing the answer's start
  assert.deepEqual(list.map((e) => [e.who, e.text]), [['user', 'আমার রাতের ওষুধ কী?'], ['bajan', 'আপনার রাতের ওষুধ']])

  list = closeTranscript(list, true) // they spoke over him
  assert.deepEqual(list.map((e) => [e.who, e.open, e.cut]), [['user', true, false], ['bajan', false, true]])
  list = appendTranscript(list, 'bajan', 'জি, বলুন।') // his next answer starts a new line
  assert.equal(list.length, 3)

  list = [...closeTranscript(list, false), newEntry('user', '', true, true), newEntry('bajan', ' ', true)]
  list = closeTranscript(list, false) // an empty answer is dropped; a voice message stays even before its words
  assert.deepEqual(list.map((e) => [e.who, e.open, e.voice]), [['user', false, false], ['bajan', false, false], ['bajan', false, false], ['user', false, true]])
  assert.equal(new Set(list.map((e) => e.id)).size, list.length, 'ids are unique (React keys)')
})

// WCAG 2 contrast ratio of two #rrggbb colours.
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('colours: every text/background pair in globals.css meets WCAG AAA (7:1)', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
  const token = (name: string) => {
    const hex = root.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]
    assert.ok(hex, `--${name} is a #rrggbb colour in :root`)
    return hex
  }
  const pairs: [string, string][] = [
    ['ink', 'bg'], ['ink', 'surface'], ['ink', 'brand-soft'], ['ink', 'user-bubble'], ['ink', 'tone-active'], ['ink', 'tone-bad'],
    ['muted', 'bg'], ['muted', 'surface'], ['muted', 'brand-soft'], ['muted', 'user-bubble'],
    ['brand', 'surface'], ['brand', 'bg'], ['brand', 'brand-soft'],
    ['help', 'surface'], ['help', 'tone-bad'],
  ]
  for (const [fg, bg] of pairs) assert.ok(contrast(token(fg), token(bg)) >= 7, `${fg} on ${bg}: ${contrast(token(fg), token(bg)).toFixed(2)}`)
  // White button text on the two filled buttons.
  for (const bg of ['brand', 'brand-strong', 'help', 'help-strong']) assert.ok(contrast('#ffffff', token(bg)) >= 7, `white on ${bg}`)
  // Control borders: 3:1 against what they sit on (WCAG 1.4.11).
  for (const bg of ['bg', 'surface']) assert.ok(contrast(token('line'), token(bg)) >= 3, `line on ${bg}`)
})

test('guide: every {label} it quotes is a real on-screen label, and both languages have the same sections', () => {
  for (const lang of ['bn', 'en'] as const) {
    const t = text(lang)
    const refs = JSON.stringify(t.guide).match(/\{[\w.]+\}/g) ?? []
    assert.ok(refs.length > 10, `${lang}: placeholders found`)
    for (const ref of refs) assert.ok(labelAt(t, ref.slice(1, -1)), `${lang}: ${ref} names no label`)
  }
  assert.deepEqual(text('bn').guide.sections.map((s) => s.id), text('en').guide.sections.map((s) => s.id))
})
