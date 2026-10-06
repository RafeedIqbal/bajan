// Optional hands-free start: listens for "ভাইজান" with the browser's speech recognition (Chrome desktop and
// Android; no Bangla on Safari/Firefox). Cloud recognition: audio goes to Google while this is on.
// Erasable TypeScript only, so `node --test` can import matchesWakeWord (lib/checks.test.ts).

// lib.dom has no SpeechRecognition constructor, so describe just what is used.
type Alternative = { readonly transcript: string }
type Result = { readonly isFinal: boolean; readonly length: number; readonly [i: number]: Alternative }
type ResultEvent = { readonly resultIndex: number; readonly results: { readonly length: number; readonly [i: number]: Result } }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: ResultEvent) => void) | null
  onerror: ((e: { readonly error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

// Only the unprefixed API (Chrome/Edge 139+, desktop and Android): Safari's webkit-only version has no Bangla.
export function wakeWordSupported(): boolean {
  return 'SpeechRecognition' in window && window.isSecureContext
}

// JS \b only knows ASCII, so Bengali word edges are spelled out: matches ভাইজান / ভাই জান / বাইজান,
// not ভাই জানে ("brother knows") or ভাইজানের. An interim transcript can stop mid-word ("ভাই জান|ে"),
// so it only counts once something non-Bengali already follows the name.
const WAKE_FINAL = /(?:^|[^\u0980-\u09FF])[ভব]াই\s?জান(?![\u0980-\u09FF])/
const WAKE_INTERIM = /(?:^|[^\u0980-\u09FF])[ভব]াই\s?জান(?=[^\u0980-\u09FF])/

export function matchesWakeWord(text: string, final = true): boolean {
  // NFC plus dropping zero-width (non-)joiners, which some keyboards and recognizers insert.
  return (final ? WAKE_FINAL : WAKE_INTERIM).test(text.normalize('NFC').replace(/[\u200C\u200D]/g, ''))
}

// Errors that mean "this will not work here". Android also reports a busy recognizer as not-allowed,
// so give up only after several in a row.
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'language-not-supported'])

export type WakeListener = { start(delayMs?: number): void; stop(): Promise<void>; dispose(): void }

export function createWakeListener(opts: {
  onWake: () => void // called after the recognizer released the mic
  onFatal: (error: string) => void
  debug?: boolean
}): WakeListener | null {
  const Recognition = recognitionConstructor()
  if (!Recognition) return null
  const rec = new Recognition()
  rec.lang = 'bn-BD'
  rec.continuous = true // ignored on Chrome Android; the restart loop covers it
  rec.interimResults = true
  rec.maxAlternatives = 3

  let wanted = false
  let running = false
  let heard = false
  let failures = 0
  let fatal = 0
  let startedAt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let ended: (() => void) | null = null

  const schedule = (ms: number) => {
    clearTimeout(timer)
    timer = setTimeout(begin, ms)
  }
  function begin() {
    if (!wanted || running || document.hidden) return
    try {
      rec.start()
      running = true
      startedAt = Date.now()
    } catch {
      schedule(1000) // the previous session has not ended yet
    }
  }

  rec.onresult = (e) => {
    failures = fatal = 0
    for (let i = e.resultIndex; i < e.results.length && !heard; i++) {
      for (let j = 0; j < e.results[i].length; j++) {
        const transcript = e.results[i][j].transcript
        if (opts.debug) console.log('[wake]', transcript)
        if (matchesWakeWord(transcript, e.results[i].isFinal)) {
          heard = true
          wanted = false
          rec.abort() // onWake runs from onend, once the mic is free
          break
        }
      }
    }
  }
  rec.onerror = (e) => {
    if (!FATAL.has(e.error)) fatal = 0 // "fatal" means several in a row
    if (e.error === 'no-speech' || e.error === 'aborted') return // routine
    failures++
    if (FATAL.has(e.error) && ++fatal >= 3) {
      wanted = false
      opts.onFatal(e.error)
    }
  }
  rec.onend = () => {
    running = false
    ended?.()
    ended = null
    if (heard) {
      heard = false
      opts.onWake()
      return
    }
    if (!wanted) return
    if (Date.now() - startedAt < 1000) failures++ // ended at once: don't spin
    schedule(failures ? Math.min(30_000, 500 * 2 ** failures) : 250)
  }

  // Chrome Android aborts recognition while the page is hidden; pick up again when it is visible.
  const onVisibility = () => {
    if (!document.hidden && wanted && !running) schedule(0)
  }
  document.addEventListener('visibilitychange', onVisibility)

  function start(delayMs = 0) {
    wanted = true
    failures = fatal = 0
    if (!running) schedule(delayMs)
  }
  // Resolves once the mic is released, so a manual Start can open it next.
  function stop(): Promise<void> {
    wanted = false
    heard = false
    clearTimeout(timer)
    if (!running) return Promise.resolve()
    return new Promise((resolve) => {
      const previous = ended // an earlier stop() may still be waiting
      ended = () => {
        previous?.()
        resolve()
      }
      setTimeout(resolve, 1500) // in case a browser never fires "end" after abort()
      rec.abort()
    })
  }
  function dispose() {
    void stop()
    document.removeEventListener('visibilitychange', onVisibility)
    rec.onresult = rec.onerror = null
    rec.onend = null
  }
  return { start, stop, dispose }
}
