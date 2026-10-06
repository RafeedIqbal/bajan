'use client'

import { useEffect, useRef, useState } from 'react'
import { callTool, LiveVoice, type ToolResult, type UsageTotals, type VoiceState } from '@/lib/live'
import { createWakeListener, wakeWordSupported, type WakeListener } from '@/lib/wake'

type Caregiver = { name: string; relationship: string }
type Help = { status: string; reason?: string; reused?: boolean; caregiver_name?: string }

const POLLED = ['requested', 'dialing', 'answered', 'unknown'] // not settled yet: keep asking the server
const DOUBLE_TAP_MS = 700 // older hands double-tap; a second tap must not hit the control that just appeared
const VOICE_TEXT: Partial<Record<VoiceState, string>> = {
  connecting: 'সংযোগ হচ্ছে…',
  listening: 'শুনছি…',
  speaking: 'বলছি…',
  reconnecting: 'আবার সংযোগ হচ্ছে…',
}
const WAKE_ERRORS: Record<string, string> = {
  'not-allowed': 'নাম শোনার জন্য মাইক্রোফোনের অনুমতি দিন।',
  'language-not-supported': 'এই ব্রাউজারে বাংলা শোনার সুবিধা নেই।',
}
const CALL_YOURSELF = 'দরকার হলে নিজে ফোন করুন, জরুরি হলে ৯৯৯।'
const NO_CAREGIVER = 'ফোন করার জন্য কোনো পরিবারের সদস্য যোগ করা নেই — "প্রোফাইল বদলান" থেকে যোগ করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।'

function helpText(help: Help, name: string): string {
  const again = help.reused ? ' একটু আগেই চেষ্টা হয়েছে, নতুন কল হয়নি; এক মিনিট পরে আবার চেষ্টা করুন।' : ''
  switch (help.status) {
    case 'sending':
      return 'অনুরোধ পাঠানো হচ্ছে…'
    case 'requested':
      return 'অনুরোধ নেওয়া হয়েছে'
    case 'dialing':
      return `${name}-কে ফোন করা হচ্ছে…`
    case 'answered':
      return `${name} ফোন ধরেছেন (সাহায্য নিশ্চিত নয়)`
    case 'ended':
      return 'কল শেষ।' + again
    case 'failed':
      return (help.reason === 'no_answer' ? 'কল হয়নি — কেউ ধরেননি।' : 'কল হয়নি — সমস্যা হয়েছে।') + again
    case 'needs_review':
      return 'কল হয়েছে কিনা নিশ্চিত নয় — নিজে ফোন করুন, জরুরি হলে ৯৯৯।'
    case 'unknown':
      return 'অবস্থা জানা যাচ্ছে না, দেখছি… ' + CALL_YOURSELF
  }
  return ''
}

export default function Assistant({ caregiver }: { caregiver: Caregiver | null }) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [help, setHelp] = useState<Help | null>(null)
  const [usage, setUsage] = useState<UsageTotals | null>(null)
  const [needsTap, setNeedsTap] = useState(false)
  const [wakeSupported, setWakeSupported] = useState(false)
  const [wakeOn, setWakeOn] = useState(false)
  const voice = useRef<LiveVoice | null>(null)
  const wake = useRef<WakeListener | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const lastTap = useRef(0)
  const unsent = useRef(false) // a help request from this page may not have reached the server

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
      return setError(NO_CAREGIVER)
    }
    if (typeof result.status === 'string') {
      if (result.status === 'none' && unsent.current) {
        setError('অনুরোধটি পৌঁছায়নি। আবার "সাহায্য চাই" চাপুন। ' + CALL_YOURSELF)
      }
      unsent.current = false
    }
    if (result.status === 'none') return setHelp(null)
    if (typeof result.status === 'string') return setHelp(result as Help)
    // Refused (signed out, no profile): never leave "sending…" up, and don't keep showing a
    // ringing call we can no longer check — say it is uncertain (which also stops polling).
    setHelp((h) => (h?.status === 'sending' ? null : h && POLLED.includes(h.status) ? { status: 'needs_review' } : h))
    setError(
      result.error === 'unauthorized'
        ? 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি নতুন করে খুলে আবার সাইন ইন করুন। ' + CALL_YOURSELF
        : 'অনুরোধ পাঠানো যায়নি। ' + CALL_YOURSELF
    )
  }

  // Created on the first tap: browsers only let audio start from a user gesture.
  function getVoice() {
    voice.current ??= new LiveVoice(new AudioContext({ sampleRate: 24000 }), {
      onState: (s) => {
        setState(s)
        if (s === 'idle' || s === 'error') setNeedsTap(false)
      },
      onUsage: setUsage,
      onToolResult: (name, result) => {
        if (name !== 'get_profile') showHelp(result, name === 'request_caregiver_call')
      },
      onError: setError,
      onIdleStop: () => setNotice('কথা না হওয়ায় বন্ধ হলো'),
      onAudioBlocked: () => setNeedsTap(true),
    })
    return voice.current
  }

  function begin(v: LiveVoice, before?: Promise<void>) {
    setError('')
    setNotice('')
    setNeedsTap(false)
    void v.start(before)
  }

  function start() {
    if (!tap()) return // the Stop (or Continue) tap landed on Start
    // Synchronous in the tap; the wake recognizer releases the mic before Gemini opens it.
    begin(getVoice(), wake.current?.stop())
  }

  function stop() {
    if (tap()) voice.current?.stop() // otherwise the Start tap landed on Stop
  }

  function askHelp() {
    lastTap.current = performance.now() // never ignore the help button itself; only guard what follows
    voice.current?.touch()
    if (caregiver) dialog.current?.showModal()
    else setError(NO_CAREGIVER)
  }

  async function confirmHelp() {
    if (!tap()) return // the Help tap landed on Yes
    dialog.current?.close()
    setError('')
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
    wake.current = createWakeListener({
      onWake: () => {
        if (voice.current) begin(voice.current)
      },
      onFatal: (e) => {
        setWakeOn(false)
        setError(WAKE_ERRORS[e] ?? 'এই ব্রাউজারে নাম শোনার সুবিধা কাজ করছে না।')
      },
      debug: new URLSearchParams(window.location.search).has('debug'),
    })
    return () => {
      wake.current?.dispose()
      voice.current?.stop()
      void voice.current?.ctx.close()
      voice.current = null
    }
  }, [])

  // Listen for the name only while no conversation is running (the assistant says its own name).
  useEffect(() => {
    if (wakeOn && (state === 'idle' || state === 'error')) wake.current?.start(800)
  }, [wakeOn, state])

  const polling = !!help && POLLED.includes(help.status)
  useEffect(() => {
    if (!polling) return
    const timer = setInterval(() => {
      void callTool(crypto.randomUUID(), 'check_help_status', {}).then(showHelp)
    }, 3000)
    return () => clearInterval(timer)
  }, [polling])

  const running = state !== 'idle' && state !== 'error'
  return (
    <section>
      <p className="voice-state" aria-hidden="true">
        {VOICE_TEXT[state] ?? ''}
      </p>
      {/* Announce connection changes only; listening/speaking would talk over Bhaijaan. */}
      <p role="status" className="note">
        {state === 'connecting' || state === 'reconnecting' ? VOICE_TEXT[state] : notice}
      </p>
      <p role="alert">{error}</p>
      {needsTap && <button onClick={continueAudio}>চালিয়ে যেতে চাপুন</button>}

      <div className="controls">
        {running ? (
          <button className="primary" onClick={stop}>
            থামুন
          </button>
        ) : (
          <button className="primary" onClick={start}>
            শুরু করুন
          </button>
        )}
        <button className="help" onClick={askHelp}>
          সাহায্য চাই
        </button>
        {!caregiver && (
          <p className="note">
            ফোন করার জন্য কেউ যোগ করা নেই — <a href="/profile">পরিবারের কাউকে যোগ করুন</a>
          </p>
        )}
        {/* aria-disabled keeps keyboard focus when playback starts; repeat() ignores taps it can't serve. */}
        <button onClick={() => voice.current?.repeat()} aria-disabled={state !== 'listening'}>
          আবার বলুন
        </button>
      </div>

      {/* A held Enter key would repeat onto "Yes" once the dialog takes focus. */}
      <dialog ref={dialog} aria-labelledby="confirm-call" onKeyDown={(e) => e.repeat && e.preventDefault()}>
        <p id="confirm-call">
          {caregiver?.name}
          {caregiver?.relationship && ` (${caregiver.relationship})`}-কে ফোন করবো?
        </p>
        <div className="controls">
          <button className="help" onClick={confirmHelp}>
            হ্যাঁ, ফোন করুন
          </button>
          <button onClick={() => dialog.current?.close()}>না</button>
        </div>
      </dialog>

      <h2>ফোনের অবস্থা</h2>
      <p role="status">{help ? helpText(help, help.caregiver_name || caregiver?.name || '') : 'কোনো অনুরোধ নেই'}</p>
      <p className="note">পরীক্ষামূলক কল — আসল ফোন যাবে না।</p>

      {wakeSupported && (
        <>
          <label>
            <input type="checkbox" checked={wakeOn} onChange={toggleWake} /> &ldquo;ভাইজান&rdquo; ডাক শুনুন
          </label>
          <p className="note">চালু থাকলে মাইকের শব্দ নাম শোনার জন্য Google-এ যায়; নাম শুনলে কথা শুরু হবে।</p>
        </>
      )}

      {usage && (usage.usd > 0 || running) && (
        <p className="cost" lang="en">
          Gemini ≈ ${usage.usd.toFixed(4)} · in: audio {usage.audioIn}, text {usage.textIn} · out: audio{' '}
          {usage.audioOut}, text {usage.textOut} tokens
        </p>
      )}
    </section>
  )
}
