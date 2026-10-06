// Runnable checks for the two pieces of non-trivial client logic: `npm test` (node:test, no dependencies).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MediaModality } from '@google/genai'
import { addUsage, ZERO_USAGE } from './live.ts'
import { matchesWakeWord } from './wake.ts'

test('wake word: ভাইজান in its spoken and transcribed forms', () => {
  for (const text of ['ভাইজান', 'ভাই জান', 'বাইজান', 'ভাই\u200Cজান', 'এই ভাইজান?', 'ও ভাইজান, শুনছেন']) {
    assert.ok(matchesWakeWord(text), text)
  }
})

test('wake word: near misses do not start a session', () => {
  for (const text of ['ভাই জানে', 'আমার ভাই জানে না', 'জানি', 'ভাইজানের', 'ভাই']) {
    assert.ok(!matchesWakeWord(text), text)
  }
})

test('wake word: an interim transcript only counts once the name is complete', () => {
  assert.ok(matchesWakeWord('ভাইজান, শুনছেন', false))
  assert.ok(matchesWakeWord('ও ভাইজান ', false))
  for (const text of ['ভাইজান', 'আমার ভাই জান', 'ভাইজানে']) assert.ok(!matchesWakeWord(text, false), text)
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
