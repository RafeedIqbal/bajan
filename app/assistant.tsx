'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { text, type ErrorKey, type Lang, type Text } from '@/lib/i18n'
import { callTool, LiveVoice, type Entry, type Mode, type ToolResult, type UsageTotals, type VoiceState } from '@/lib/live'
import { createWakeListener, wakeWordSupported, type WakeListener } from '@/lib/wake'
import Avatar from './avatar'
import still from './avatar.webp'
import { ChatIcon, CloseIcon, MicIcon, PhoneIcon, RecordDot, RepeatIcon, SendIcon, StopIcon } from './icons'

type Caregiver = { name: string; relationship: string }
type Help = { status: string; reason?: string; reused?: boolean; caregiver_name?: string }

const POLLED = ['requested', 'dialing', 'answered', 'unknown'] // not settled yet: keep asking the server
const DOUBLE_TAP_MS = 700 // older hands double-tap; a second tap must not hit the control that just appeared
const MAX_VOICE_SECONDS = 120 // a voice message sends itself at two minutes
const WAKE_ERRORS: Record<string, ErrorKey> = {
  'not-allowed': 'wake_not_allowed',
  'language-not-supported': 'wake_no_bangla',
}

function helpText(t: Text, help: Help, name: string): string {
  const again = help.reused ? t.reused : ''
  switch (help.status) {
    case 'sending':
      return t.sending
    case 'requested':
      return t.requested
    case 'dialing':
      return t.dialing(name)
    case 'answered':
      return t.answered(name)
    case 'ended':
      return t.ended + again
    case 'failed':
      return (help.reason === 'no_answer' ? t.failedNoAnswer : t.failedError) + again
    case 'needs_review':
      return t.needsReview
    case 'unknown':
      return t.unknown
  }
  return ''
}

// The call-status pill's colour; the words always say the same thing.
function helpTone(help: Help | null): string | undefined {
  if (!help) return undefined
  if (help.status === 'answered' || help.status === 'ended') return 'ok'
  if (help.status === 'failed' || help.status === 'needs_review') return 'bad'
  return 'active'
}

// So screen readers read each transcript line in its own language.
function langOf(s: string): Lang {
  return (s.match(/\p{Script=Bengali}/gu)?.length ?? 0) >= (s.match(/\p{Script=Latin}/gu)?.length ?? 0) ? 'bn' : 'en'
}

// `notice` sits above the conversation; `children` (profile, account buttons) below it.
type Props = { caregiver: Caregiver | null; lang: Lang; notice?: ReactNode; children?: ReactNode }

export default function Assistant({ caregiver, lang, notice, children }: Props) {
  const t = text(lang)
  const [state, setState] = useState<VoiceState>('idle')
  const [mode, setMode] = useState<Mode>('talk')
  // Kept as keys, not sentences, so switching the screen language rewords what is already shown.
  const [error, setError] = useState<ErrorKey | null>(null)
  const [idleStopped, setIdleStopped] = useState(false)
  const [help, setHelp] = useState<Help | null>(null)
  const [usage, setUsage] = useState<UsageTotals | null>(null)
  const [needsTap, setNeedsTap] = useState(false)
  const [wakeSupported, setWakeSupported] = useState(false)
  const [wakeOn, setWakeOn] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [draft, setDraft] = useState('')
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [debug, setDebug] = useState(false) // ?debug shows the token/cost readout (for the README cost record)
  const voice = useRef<LiveVoice | null>(null)
  const wake = useRef<WakeListener | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const log = useRef<HTMLOListElement>(null)
  const atBottom = useRef(true) // follow new transcript lines unless the user scrolled up to read
  const lastTap = useRef(-Infinity) // not 0: performance.now() starts at page load, so 0 would ignore early taps
  const unsent = useRef(false) // a help request from this page may not have reached the server
  const recordButton = useRef<HTMLButtonElement>(null)
  const wasRecording = useRef(false)

  // One guard for controls that swap or move under the finger; only taps that act are timed.
  function tap(): boolean {
    const now = performance.now()
    if (now - lastTap.current < DOUBLE_TAP_MS) return false
    lastTap.current = now
    return true
  }

  // Server answers about the help request (from the button, a poll or a Gemini tool call).
  // `asked`: this answer is for a new request, so an unreachable server means it may never have arrived.
  function showHelp(result: ToolResult | null, asked = false) {
    if (result === null) {
      unsent.current ||= asked
      return setHelp({ status: 'unknown' }) // could not reach the server: keep checking
    }
    if (result.status === 'needs_confirmation') return
    if (result.status === 'no_caregiver') {
      setHelp((h) => (h?.status === 'sending' ? null : h))
      return setError('no_caregiver')
    }
    if (typeof result.status === 'string') {
      if (result.status === 'none' && unsent.current) setError('help_unsent')
      unsent.current = false
    }
    if (result.status === 'none') return setHelp(null)
    if (typeof result.status === 'string') return setHelp(result as Help)
    // Refused (signed out, no profile): never leave "sending…" up, and don't keep showing a
    // ringing call we can no longer check — say it is uncertain (which also stops polling).
    setHelp((h) => (h?.status === 'sending' ? null : h && POLLED.includes(h.status) ? { status: 'needs_review' } : h))
    setError(result.error === 'unauthorized' ? 'help_signed_out' : 'help_not_sent')
  }

  // Created on the first tap: browsers only let audio start from a user gesture.
  function getVoice() {
    voice.current ??= new LiveVoice(new AudioContext({ sampleRate: 24000 }), {
      onState: (s, m) => {
        setState(s)
        setMode(m)
        if (s === 'idle' || s === 'error') setNeedsTap(false)
      },
      onTranscript: setEntries,
      onUsage: setUsage,
      onToolResult: (name, result) => {
        if (name !== 'get_profile') showHelp(result, name === 'request_caregiver_call')
      },
      onError: (e) => {
        setError(e)
        setRecording(voice.current?.recording ?? false) // some errors end the recording, some don't
      },
      onIdleStop: () => setIdleStopped(true),
      onAudioBlocked: setNeedsTap,
    })
    return voice.current
  }

  // Clears old notices before anything new starts, except help-request ones: after a failed request that
  // alert may be the only sign of it.
  function fresh() {
    setError((e) => (e?.startsWith('help_') || e === 'no_caregiver' ? e : null))
    setIdleStopped(false)
    atBottom.current = true
  }

  function begin(v: LiveVoice, before?: Promise<void>) {
    fresh()
    setNeedsTap(false)
    void v.start(before)
  }

  function start() {
    // Start stays in place (disabled) while recording, so nothing slides under the finger.
    if (recording || !tap()) return // the Stop (or Continue) tap landed on Start
    // Synchronous in the tap; the wake recognizer releases the mic before Gemini opens it.
    begin(getVoice(), wake.current?.stop())
  }

  function stop() {
    if (tap()) voice.current?.stop() // otherwise the Start tap landed on Stop
  }

  function sendText(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const message = draft.trim()
    if (!message) return
    fresh()
    setDraft('')
    getVoice().sendText(message)
  }

  function record() {
    if (!tap()) return
    fresh()
    setSeconds(0)
    setRecording(true)
    void getVoice().record(wake.current?.stop()) // the wake recognizer releases the mic first
  }

  function finishRecording(send: boolean) {
    setRecording(false)
    if (send) voice.current?.sendRecording()
    else voice.current?.cancelRecording()
  }

  function askHelp() {
    lastTap.current = performance.now() // never ignore the help button itself; only guard what follows
    voice.current?.touch()
    if (caregiver) dialog.current?.showModal()
    else setError('no_caregiver')
  }

  async function confirmHelp() {
    if (!tap()) return // the Help tap landed on Yes
    dialog.current?.close()
    setError(null)
    setHelp({ status: 'sending' })
    showHelp(await callTool(crypto.randomUUID(), 'request_caregiver_call', { confirmed: true }), true)
  }

  async function continueAudio() {
    lastTap.current = performance.now() // the controls move up into this spot when it hides
    setNeedsTap(!(await voice.current?.resumeAudio()))
  }

  function toggleWake() {
    if (wakeOn) void wake.current?.stop()
    else void getVoice().ctx.resume() // unlock audio now, for sessions the wake word starts later
    setWakeOn(!wakeOn)
  }

  useEffect(() => {
    // A request survives reloads and dropped connections. If the check fails, keep checking (unknown).
    void callTool(crypto.randomUUID(), 'check_help_status', {}).then((r) => {
      if (r === null) setHelp((h) => h ?? { status: 'unknown' })
      else if (typeof r.status === 'string' && r.status !== 'none') setHelp((h) => h ?? (r as Help))
    })
    setWakeSupported(wakeWordSupported())
    const debug = new URLSearchParams(window.location.search).has('debug')
    setDebug(debug)
    wake.current = createWakeListener({
      onWake: () => {
        if (voice.current) begin(voice.current)
      },
      onFatal: (e) => {
        setWakeOn(false)
        setError(WAKE_ERRORS[e] ?? 'wake_failed')
      },
      debug,
    })
    return () => {
      wake.current?.dispose()
      voice.current?.stop()
      void voice.current?.ctx.close()
      voice.current = null
    }
  }, [])

  const running = state !== 'idle' && state !== 'error'
  const talking = running && mode === 'talk'

  // Listen for the name only while nothing else runs: no session (the assistant says its own name, and a
  // message session plays answers) and no recording (which needs the mic).
  useEffect(() => {
    if (wakeOn && !running && !recording) wake.current?.start(800)
    else void wake.current?.stop()
  }, [wakeOn, running, recording])

  const polling = !!help && POLLED.includes(help.status)
  useEffect(() => {
    if (!polling) return
    const timer = setInterval(() => {
      void callTool(crypto.randomUUID(), 'check_help_status', {}).then(showHelp)
    }, 3000)
    return () => clearInterval(timer)
  }, [polling])

  useEffect(() => {
    if (!recording) return
    const started = performance.now()
    const timer = setInterval(() => {
      const s = Math.floor((performance.now() - started) / 1000)
      setSeconds(s)
      if (s >= MAX_VOICE_SECONDS) finishRecording(true)
    }, 250)
    return () => clearInterval(timer)
  }, [recording])

  // When the recording controls go away (sent, cancelled or failed), keyboard focus returns to Record.
  useEffect(() => {
    if (wasRecording.current && !recording) recordButton.current?.focus()
    wasRecording.current = recording
  }, [recording])

  useEffect(() => {
    if (atBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight
  }, [entries])

  const voiceText = running ? t[state] : ''
  const stateText = recording ? t.recording(seconds, MAX_VOICE_SECONDS) : idleStopped && !running ? t.idleStopped : voiceText
  return (
    <div className="home-grid">
      {/* Phones: one column in this order. Computers: these on the left, the conversation on the right. */}
      <div className="home-col">
        <section className="card hero-card">
          <div className="hero">
            <Avatar state={state} recording={recording} />
            {/* Always there, one line tall: text appearing here must never push the buttons below it. */}
            <p className="voice-state" aria-hidden="true" data-hint={stateText ? undefined : ''}>
              {stateText || t.idleHint}
            </p>
            {/* Screen readers get connection changes only; listening/speaking would talk over Bhaijaan. */}
            <p role="status" className="sr-only">
              {state === 'connecting' || state === 'reconnecting' ? voiceText : idleStopped ? t.idleStopped : ''}
            </p>
          </div>
          <p role="alert">{error ? t.errors[error] : ''}</p>
          {needsTap && (
            <button className="primary continue" onClick={continueAudio}>
              {t.continueAudio}
            </button>
          )}

          <div className="controls">
            {talking ? (
              <button className="primary" onClick={stop}>
                <StopIcon />
                {t.stop}
              </button>
            ) : (
              <button className="primary" onClick={start} aria-disabled={recording || undefined}>
                <MicIcon />
                {t.start}
              </button>
            )}
            <button className="help" onClick={askHelp}>
              <PhoneIcon />
              {t.help}
            </button>
            {!caregiver && (
              <p className="note">
                {t.noCaregiverNote} <a href="/profile">{t.addCaregiver}</a>
              </p>
            )}
            {/* aria-disabled keeps keyboard focus when playback starts; repeat() ignores taps it can't serve. */}
            <button onClick={() => voice.current?.repeat()} aria-disabled={recording || (state !== 'listening' && state !== 'ready')}>
              <RepeatIcon />
              {t.repeat}
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="call-status">
          <div className="status-head">
            <h2 id="call-status" className="card-title">
              <PhoneIcon />
              {t.callStatus}
            </h2>
            <p role="status" className="pill" data-tone={helpTone(help)}>
              {help ? helpText(t, help, help.caregiver_name || caregiver?.name || '') : t.noRequest}
            </p>
          </div>
          <p className="note">{t.testCall}</p>
        </section>
      </div>

      {/* A held Enter key would repeat onto "Yes" once the dialog takes focus. */}
      <dialog ref={dialog} aria-labelledby="confirm-call" onKeyDown={(e) => e.repeat && e.preventDefault()}>
        <span className="dialog-icon" aria-hidden="true">
          <PhoneIcon />
        </span>
        <p id="confirm-call">
          {caregiver && t.confirmCall(caregiver.name + (caregiver.relationship ? ` (${caregiver.relationship})` : ''))}
        </p>
        <p className="note">{t.testCall}</p>
        <div className="controls">
          <button className="help" onClick={confirmHelp}>
            <PhoneIcon />
            {t.yesCall}
          </button>
          <button onClick={() => dialog.current?.close()}>{t.no}</button>
        </div>
      </dialog>

      <div className="home-col">
        {notice}
        <section className="card" aria-labelledby="conversation">
          <h2 id="conversation" className="card-title">
            <ChatIcon />
            {t.conversation}
          </h2>
          {entries.length ? (
            // Not a live region: Bhaijaan's answers are spoken already. Focusable so keyboards can scroll it.
            <ol
              ref={log}
              className="transcript"
              aria-labelledby="conversation"
              tabIndex={0}
              onScroll={(e) => {
                const el = e.currentTarget
                atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
              }}
            >
              {entries.map((e) => (
                <li key={e.id} className={e.who}>
                  {e.who === 'bhaijaan' && <Image src={still} alt="" width={32} height={32} />}
                  <div className="bubble">
                    {/* The name stays visible: left/right alone must not be the only way to tell who spoke. */}
                    <strong className="who">
                      {e.who === 'user' ? t.you : t.title}
                      {e.voice && <MicIcon />}
                      <span className="sr-only">:</span>
                    </strong>{' '}
                    <span lang={e.text ? langOf(e.text) : lang}>
                      {e.voice && !e.text && t.voiceMessage}
                      {e.text}
                      {e.cut && ' …'}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="transcript-empty">
              <ChatIcon />
              <p className="note">{t.transcriptEmpty}</p>
            </div>
          )}

          <form onSubmit={sendText}>
            <label htmlFor="message">{t.typeLabel}</label>
            <div className="composer-row">
              <input
                id="message"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                enterKeyHint="send"
                autoComplete="off"
              />
              <button type="submit" className="primary">
                <SendIcon />
                {t.send}
              </button>
            </div>
            {!recording && !talking && (
              <button type="button" className="tonal" ref={recordButton} onClick={record}>
                <MicIcon />
                {t.recordVoice}
              </button>
            )}
          </form>
          {recording && (
            <div className="recording-bar">
              <p className="recording">
                <RecordDot />
                {t.recording(seconds, MAX_VOICE_SECONDS)}
              </p>
              {/* Focus moves here because the record button it replaces is gone. */}
              <button className="primary" autoFocus onClick={() => tap() && finishRecording(true)}>
                <SendIcon />
                {t.sendVoice}
              </button>
              <button onClick={() => tap() && finishRecording(false)}>
                <CloseIcon />
                {t.cancel}
              </button>
            </div>
          )}
          <p className="note">{t.messageNote}</p>
        </section>

        {wakeSupported && (
          <section className="card">
            <label className="switch-row">
              <span>{t.wakeToggle}</span>
              <input type="checkbox" className="switch" checked={wakeOn} onChange={toggleWake} aria-describedby="wake-note" />
            </label>
            <p id="wake-note" className="note">
              {t.wakeNote}
            </p>
          </section>
        )}

        {children}

        {debug && usage && (usage.usd > 0 || running) && (
          <p className="cost" lang="en">
            Gemini ≈ ${usage.usd.toFixed(4)} · in: audio {usage.audioIn}, text {usage.textIn} · out: audio{' '}
            {usage.audioOut}, text {usage.textOut} tokens
          </p>
        )}
      </div>
    </div>
  )
}
