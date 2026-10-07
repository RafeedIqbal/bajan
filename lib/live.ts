// Browser side of the Gemini Live conversation: live talk (open mic) or typed and recorded messages, playback,
// transcripts of both sides, reconnects, tool relay, Repeat, idle stop and usage tally. Erasable TypeScript
// only, so `node --test` can import it (lib/checks.test.ts).
import {
  GoogleGenAI,
  MediaModality,
  type Content,
  type FunctionCall,
  type LiveConnectConfig,
  type LiveServerMessage,
  type ModalityTokenCount,
  type Session,
  type UsageMetadata,
} from '@google/genai'

// listening: live talk, the mic is open. ready: a message session, the mic is closed.
// thinking: a typed or recorded message was sent and the answer has not started.
export type VoiceState = 'idle' | 'connecting' | 'listening' | 'ready' | 'thinking' | 'speaking' | 'reconnecting' | 'error'
// talk: the mic streams and Gemini decides when the user stopped speaking.
// messages: typed text and recorded voice messages, each sent as one complete turn.
export type Mode = 'talk' | 'messages'
// One line of the on-screen transcript. `open` while words may still arrive; `cut` if he was interrupted.
export type Entry = { id: number; who: 'user' | 'bajan'; text: string; open: boolean; voice: boolean; cut: boolean }
export type ToolResult = Record<string, unknown>
export type UsageTotals = { audioIn: number; textIn: number; audioOut: number; textOut: number; usd: number }
// What went wrong, for the screen to word in its own language (lib/i18n.ts).
export type VoiceError =
  | 'offline'
  | 'mic_denied'
  | 'mic_missing'
  | 'mic_busy'
  | 'mic_ended'
  | 'nothing_recorded'
  | 'message_unsent'
  | 'signed_out'
  | 'no_profile'
  | 'unavailable'

type Token = { token: string; model: string; apiVersion: string; config: LiveConnectConfig; greeting: string }
type Events = {
  onState: (state: VoiceState, mode: Mode) => void
  onTranscript: (entries: Entry[]) => void
  onUsage: (totals: UsageTotals) => void
  onToolResult: (name: string, result: ToolResult | null) => void // null: the server could not be reached
  onError: (error: VoiceError) => void
  onIdleStop: () => void
  onAudioBlocked: (blocked: boolean) => void
}

const OUTPUT_RATE = 24000 // Gemini always replies with 24 kHz PCM16
const IDLE_MS = 3 * 60_000
const CONNECT_TIMEOUT_MS = 15_000
const RECONNECT_ATTEMPTS = 5 // waits of 1, 2, 4 and 8 s: rides out ~15 s offline (network handoffs)
const MAX_DROPS = 3 // closes in a row without a completed turn before giving up
const MAX_ENTRIES = 200 // transcript lines kept on screen
const HISTORY_ENTRIES = 30 // transcript lines carried into a new socket
const UNKNOWN_HELP =
  'status_unknown: the help request may have been placed. Do not say it failed. Tell the user you are checking, then call check_help_status. If it stays unknown, tell the user to phone the caregiver directly, or 999 in an emergency.'
const UNAVAILABLE: Record<string, string> = {
  get_profile: 'profile_unavailable: say you cannot read the records right now; do not guess.',
  check_help_status: 'status_unavailable: say you cannot check right now; do not guess the call status.',
}

// Mic samples -> clamped little-endian PCM16, posted every 960 samples (40 ms at 24 kHz).
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(960); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]))
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff
      if (this.n === this.buf.length) {
        this.port.postMessage(this.buf.buffer, [this.buf.buffer])
        this.buf = new Int16Array(960)
        this.n = 0
      }
    }
    return true
  }
}
registerProcessor('pcm-capture', PcmCapture)
`

// USD per 1M tokens, gemini-3.8-live paid tier (ai.google.dev/gemini-api/docs/pricing, checked 2026-10-06).
const PRICE_IN: Record<string, number> = { AUDIO: 3, TEXT: 0.75 }
const PRICE_OUT: Record<string, number> = { AUDIO: 12, TEXT: 4.5 }

export const ZERO_USAGE: UsageTotals = { audioIn: 0, textIn: 0, audioOut: 0, textOut: 0, usd: 0 }

// Adds one usageMetadata message (Gemini sends one per turn, not a running total) to the session totals.
// Thinking is billed as text output. Tokens the per-modality details leave out are counted as text.
// ponytail: an estimate from list prices; the README cost record checks it against the billing report.
// Transcripts are billed as text output but never reported here (~$0.001 per minute of speech, 2026-10-07).
export function addUsage(t: UsageTotals, u: UsageMetadata): UsageTotals {
  const next = { ...t }
  const add = (n: number, out: boolean, audio: boolean) => {
    if (out && audio) next.audioOut += n
    else if (out) next.textOut += n
    else if (audio) next.audioIn += n
    else next.textIn += n
    next.usd += (n * (out ? PRICE_OUT : PRICE_IN)[audio ? 'AUDIO' : 'TEXT']) / 1e6
  }
  const addList = (list: ModalityTokenCount[] | undefined, total: number | undefined, out: boolean) => {
    let listed = 0
    for (const d of list ?? []) {
      listed += d.tokenCount ?? 0
      add(d.tokenCount ?? 0, out, d.modality === MediaModality.AUDIO)
    }
    add(Math.max(0, (total ?? 0) - listed), out, false)
  }
  addList(u.promptTokensDetails, u.promptTokenCount, false)
  addList(u.toolUsePromptTokensDetails, u.toolUsePromptTokenCount, false)
  addList(u.responseTokensDetails, u.responseTokenCount, true)
  add(u.thoughtsTokenCount ?? 0, true, false)
  return next
}

let lastEntryId = 0

export function newEntry(who: Entry['who'], text: string, open: boolean, voice = false): Entry {
  return { id: ++lastEntryId, who, text, open, voice, cut: false }
}

// Adds a transcription chunk to the speaker's open line, or starts one. The user's words can still be
// arriving after Bajan starts answering, so they join the user's own line above his.
export function appendTranscript(list: Entry[], who: Entry['who'], text: string): Entry[] {
  const i = list.findLastIndex((e) => e.who === who && e.open)
  if (i < 0) return [...list, newEntry(who, text, true)]
  const next = list.slice()
  next[i] = { ...list[i], text: list[i].text + text }
  return next
}

// A finished turn closes every open line; an interruption closes only Bajan's (the user is still talking),
// marked as cut off if he was still speaking. Lines with no words are dropped, except a voice message's.
export function closeTranscript(list: Entry[], interrupted: boolean, cut = interrupted): Entry[] {
  return list
    .map((e) => (e.open && (!interrupted || e.who === 'bajan') ? { ...e, open: false, cut } : e))
    .filter((e) => e.open || e.voice || e.text.trim())
}

// POSTs a tool call to the server. Retries network errors, timeouts and 5xx with the same id, which is safe
// because the server dedupes help requests on it. Returns the JSON body (including 4xx errors), or null
// when the server could not be reached at all.
export async function callTool(id: string, name: string, args: object): Promise<ToolResult | null> {
  for (const wait of [0, 1000, 3000]) {
    if (wait) await sleep(wait)
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, name, args }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.status < 500) return await res.json()
    } catch {
      // offline or timed out: try again
    }
  }
  return null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pcm16ToFloat32(base64: string): Float32Array<ArrayBuffer> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return Float32Array.from(new Int16Array(bytes.buffer, 0, bytes.length >> 1), (v) => v / 32768)
}

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

// Why a start, recording or reconnect failed.
function failure(e: unknown): VoiceError {
  if (e instanceof Error && e.name === 'TokenError') return e.message as VoiceError
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError') return 'mic_denied'
  if (name === 'NotFoundError') return 'mic_missing'
  if (name === 'NotReadableError') return 'mic_busy'
  return 'offline'
}

export class LiveVoice {
  readonly ctx: AudioContext
  private ev: Events
  private state: VoiceState = 'idle'
  private mode: Mode = 'talk'
  private epoch = 0 // bumped on every start, reconnect and stop; callbacks from older sockets are ignored
  private session: Session | null = null
  private open = false
  private token: Token | null = null
  private handle: string | null = null
  private nonce = ''
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private capture: AudioWorkletNode | null = null // created once; only the mic source is (dis)connected
  private worklet: Promise<void> | null = null
  private clip: ArrayBuffer[] | null = null // the voice message being recorded
  private outbox: ((s: Session) => void)[] = [] // messages waiting for the socket
  private transcript: Entry[] = []
  private conversationFrom = 0 // lines after this id belong to the current conversation
  private sources = new Set<AudioBufferSourceNode>()
  private nextTime = 0
  private turn: Float32Array<ArrayBuffer>[] = []
  private turnInterrupted = false
  private lastTurn: Float32Array<ArrayBuffer>[] = []
  private replaying = false
  private cutOff = false // a message stopped him mid-answer; Gemini's "interrupted" follows
  private tinyChunks = 0
  private pendingTools = 0
  private cancelled = new Set<string>()
  private reconnecting = false
  private drops = 0
  private goAwayPending = false
  private goAwayTimer: ReturnType<typeof setTimeout> | undefined
  private idleTimer: ReturnType<typeof setTimeout> | undefined
  private totals: UsageTotals = ZERO_USAGE

  constructor(ctx: AudioContext, ev: Events) {
    this.ctx = ctx
    this.ev = ev
    // iOS suspends ("interrupted") audio when the page is backgrounded; a tap must resume it.
    ctx.onstatechange = () => {
      if (this.open) ev.onAudioBlocked(ctx.state !== 'running')
    }
  }

  // Live talk. Call synchronously from a tap (or after a tap unlocked audio): resumes audio before any await.
  // `before` lets the caller release the mic first (the wake-word recognizer). A running message session is
  // replaced, since voice detection is fixed when a socket opens; the conversation carries over.
  async start(before?: Promise<void>): Promise<void> {
    if (this.active()) {
      if (this.mode === 'talk') return // one session at a time
      this.halt()
    }
    return this.begin('talk', before)
  }

  // Ends the conversation: the next start, message or recording begins a new one.
  stop(): void {
    this.conversationFrom = lastEntryId
    this.halt()
  }

  // A typed message. Opens a message session if nothing is running.
  sendText(text: string): void {
    this.say((s) => s.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true }))
    this.setTranscript([...this.transcript, newEntry('user', text, false)])
  }

  // Starts recording a voice message; call from a tap, like start(). Not during live talk (just speak).
  // The message session connects while they speak.
  // ponytail: if that connection fails for good, the clip is dropped with it and the error says to try again.
  async record(before?: Promise<void>): Promise<void> {
    if (this.clip || (this.active() && this.mode === 'talk')) return
    const clip: ArrayBuffer[] = []
    this.clip = clip
    const resumed = this.ctx.resume()
    this.cutAnswer() // and keep him quiet while recording (see onMessage), or the mic would hear him
    if (this.active()) this.touch()
    else void this.begin('messages')
    try {
      await before
      if (this.clip === clip) await this.micOn(resumed, () => this.clip === clip)
    } catch (e) {
      if (this.clip !== clip) return
      console.error('recording failed', e)
      this.cancelRecording()
      this.ev.onError(failure(e))
    }
  }

  // Sends the recording as one turn. Message sessions turn Gemini's voice detection off and mark the clip
  // with activityStart/activityEnd, so pauses can't split it (with detection on, a 3 s pause made Gemini
  // answer the first half; tested 2026-10-07).
  // ponytail: the clip goes up only after Send (so Cancel works), adding upload and processing time.
  sendRecording(): void {
    const clip = this.clip
    if (!clip) return
    this.clip = null
    this.releaseMic()
    if (!clip.length) return this.ev.onError('nothing_recorded') // e.g. Send before allowing the mic
    const mimeType = `audio/pcm;rate=${this.ctx.sampleRate}`
    this.say((s) => {
      s.sendRealtimeInput({ activityStart: {} })
      for (const chunk of clip) s.sendRealtimeInput({ audio: { data: toBase64(chunk), mimeType } })
      s.sendRealtimeInput({ activityEnd: {} })
    })
    this.setTranscript([...this.transcript, newEntry('user', '', true, true)]) // its transcription fills it in
  }

  get recording(): boolean {
    return this.clip !== null
  }

  cancelRecording(): void {
    this.clip = null
    this.releaseMic()
  }

  // Replays the last answer locally: no tokens, and the live mic is paused so Gemini does not hear it.
  repeat(): void {
    if (this.state !== 'listening' && this.state !== 'ready') return // not mid-answer or awaiting one
    if (this.clip || !this.open || !this.lastTurn.length || this.sources.size || this.turn.length) return
    this.replaying = true
    if (this.mode === 'talk') this.session?.sendRealtimeInput({ audioStreamEnd: true })
    for (const pcm of this.lastTurn) this.play(pcm)
    this.touch()
  }

  // Any user activity keeps the session from idling out.
  touch(): void {
    if (!this.active()) return
    clearTimeout(this.idleTimer)
    // Activity is the user's own words (input transcription), messages, taps and model turns. This bounds
    // false wakes and forgotten sessions, which Gemini 3.8 bills for the whole time the mic streams.
    this.idleTimer = setTimeout(() => {
      if (this.clip) return this.touch() // still recording
      const talk = this.mode === 'talk'
      this.halt()
      if (talk) this.ev.onIdleStop() // a quiet message session just closes; the next message reopens it
    }, IDLE_MS)
  }

  // Resolves true if audio is running again (iOS may refuse while a phone call holds the audio session).
  async resumeAudio(): Promise<boolean> {
    await this.ctx.resume().catch(() => {})
    return this.ctx.state === 'running'
  }

  private active(): boolean {
    return this.state !== 'idle' && this.state !== 'error'
  }

  // What the screen shows while nobody is speaking.
  private waiting(): VoiceState {
    return this.mode === 'talk' ? 'listening' : 'ready'
  }

  // Opens a socket for this mode. The conversation so far (until someone pressed Stop) is replayed into it
  // as text, so switching modes or coming back after an idle stop or an error keeps the thread.
  private async begin(mode: Mode, before?: Promise<void>): Promise<void> {
    const epoch = ++this.epoch
    const resumed = this.ctx.resume()
    this.mode = mode
    this.setState('connecting')
    const history = this.conversation()
    if (!history.length) {
      this.totals = ZERO_USAGE
      this.ev.onUsage(this.totals)
    }
    this.nonce = crypto.randomUUID()
    this.token = null
    this.handle = null
    this.drops = 0
    try {
      await before
      if (epoch !== this.epoch) return
      if (mode === 'talk' && !(await this.micOn(resumed, () => epoch === this.epoch))) return
      await resumed
      await this.connect(epoch)
      if (history.length) this.session?.sendClientContent({ turns: history, turnComplete: false })
      if (mode === 'talk') {
        // The user's spoken "বাজান" never reaches Gemini (Start tap or browser wake word), so say it for
        // them, in the language the server picked for the greeting.
        // (cast: TS keeps the `this.token = null` narrowing from above across the awaits)
        const greeting = (this.token as Token | null)?.greeting ?? 'বাজান'
        this.session?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: greeting }] }], turnComplete: true })
      }
      this.flush()
    } catch (e) {
      if (epoch !== this.epoch) return
      console.error('voice start failed', e)
      this.fail(failure(e))
    }
  }

  private halt(next: VoiceState = 'idle'): void {
    this.epoch++
    clearTimeout(this.idleTimer)
    clearTimeout(this.goAwayTimer)
    this.closeSession()
    this.cancelRecording()
    this.stopPlayback()
    this.turn = []
    this.turnInterrupted = this.cutOff = false
    this.lastTurn = []
    this.outbox = []
    this.cancelled.clear()
    this.pendingTools = 0
    this.reconnecting = this.goAwayPending = false
    this.token = this.handle = null
    this.setTranscript(closeTranscript(this.transcript, false))
    void this.ctx.suspend()
    if (this.totals.usd > 0) console.info('Gemini session usage', this.totals)
    this.setState(next)
  }

  // Sends a typed or recorded message now, or once the socket is (re)connected; opens a message session if
  // nothing is running. A new message cuts the current answer, as speaking over him does.
  private say(send: (s: Session) => void): void {
    void this.ctx.resume() // from the tap: "Tap to continue" may be up
    if (!this.active()) void this.begin('messages')
    this.cutAnswer()
    this.outbox.push(send)
    this.flush()
    this.touch()
  }

  private flush(): void {
    if (!this.open || !this.session || !this.outbox.length) return
    for (const send of this.outbox.splice(0)) send(this.session)
    this.setState('thinking')
  }

  // Stops his answer here; Gemini stops generating it once it gets the next message.
  private cutAnswer(): void {
    if (this.turn.length) this.turnInterrupted = true // not a whole answer for Repeat
    this.cutOff ||= this.sources.size > 0
    this.stopPlayback()
  }

  // The current conversation as Gemini turns, for a new socket.
  private conversation(): Content[] {
    return this.transcript
      .filter((e) => e.id > this.conversationFrom && e.text.trim())
      .slice(-HISTORY_ENTRIES)
      .map((e) => ({ role: e.who === 'user' ? 'user' : 'model', parts: [{ text: e.text }] }))
  }

  // Opens the mic into the capture worklet: streamed to Gemini during live talk, kept in the clip while
  // recording. Returns false if it is no longer wanted by the time it opens.
  private async micOn(resumed: Promise<void>, wanted: () => boolean): Promise<boolean> {
    const stream = await this.openMic()
    if (!wanted()) {
      stream.getTracks().forEach((t) => t.stop())
      return false
    }
    this.stream = stream
    stream.getAudioTracks()[0]?.addEventListener('ended', () => {
      if (this.stream !== stream) return
      if (!this.clip) return this.fail('mic_ended')
      this.cancelRecording()
      this.ev.onError('mic_ended')
    })
    await resumed
    this.worklet ??= this.loadWorklet()
    await this.worklet
    if (this.stream !== stream) return false // released while loading
    if (!this.capture) {
      this.capture = new AudioWorkletNode(this.ctx, 'pcm-capture')
      this.capture.port.onmessage = (e: MessageEvent<ArrayBuffer>) => this.onMic(e.data)
      this.capture.connect(this.ctx.destination) // outputs silence; keeps the worklet running
    }
    this.source = this.ctx.createMediaStreamSource(stream)
    this.source.connect(this.capture)
    return true
  }

  private releaseMic(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.source?.disconnect()
    this.source = null
  }

  private async openMic(): Promise<MediaStream> {
    if (!navigator.mediaDevices) throw new Error('insecure context')
    const constraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      // Android can take a moment to release the mic from the wake-word recognizer.
      if (!(e instanceof DOMException && e.name === 'NotReadableError')) throw e
      await sleep(300)
      return navigator.mediaDevices.getUserMedia(constraints)
    }
  }

  private async loadWorklet(): Promise<void> {
    const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }))
    try {
      await this.ctx.audioWorklet.addModule(url)
    } catch (e) {
      this.worklet = null
      throw e
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  private async connect(epoch: number): Promise<void> {
    this.token ??= await fetchToken()
    if (epoch !== this.epoch) throw new Error('superseded')
    const t = this.token
    const config: LiveConnectConfig =
      this.mode === 'talk' ? t.config : { ...t.config, realtimeInputConfig: { automaticActivityDetection: { disabled: true } } }
    const ai = new GoogleGenAI({ apiKey: t.token, httpOptions: { apiVersion: t.apiVersion } })
    let live = true // false once this attempt failed, so its socket can never act later
    let closedEarly: (e: Error) => void = () => {}
    let timer: ReturnType<typeof setTimeout> | undefined
    // The SDK's connect() never settles if the socket closes before setup, so race it.
    const failure = new Promise<never>((_, reject) => {
      closedEarly = reject
      timer = setTimeout(() => reject(new Error('connect timeout')), CONNECT_TIMEOUT_MS)
    })
    const connecting = ai.live.connect({
      model: t.model,
      config: { ...config, sessionResumption: this.handle ? { handle: this.handle } : {} },
      callbacks: {
        onmessage: (m: LiveServerMessage) => {
          if (live && epoch === this.epoch) this.onMessage(m)
        },
        onerror: () => {},
        onclose: (e: CloseEvent) => {
          console.warn('Gemini socket closed', e.code, e.reason) // the reason names config/version errors
          closedEarly(new Error(`closed ${e.code} ${e.reason}`))
          if (live && epoch === this.epoch && this.open) void this.reconnect()
        },
      },
    })
    try {
      const session = await Promise.race([connecting, failure])
      if (epoch !== this.epoch) {
        session.close()
        throw new Error('superseded')
      }
      this.session = session
      this.open = true
    } catch (e) {
      live = false
      connecting.then((s) => s.close()).catch(() => {})
      throw e
    } finally {
      clearTimeout(timer)
    }
    this.setState(this.sources.size ? 'speaking' : this.waiting())
    if (this.ctx.state !== 'running') this.ev.onAudioBlocked(true)
    this.touch()
  }

  // Resume after a drop or a goAway: same token + handle first, then a fresh token.
  private async reconnect(): Promise<void> {
    if (this.reconnecting || !this.active()) return
    if (++this.drops > MAX_DROPS) return this.fail('offline') // the server keeps closing: don't loop
    this.reconnecting = true
    this.goAwayPending = false
    clearTimeout(this.goAwayTimer)
    const epoch = ++this.epoch // the old socket's callbacks are now ignored
    const unanswered = this.state === 'thinking' // a message went out on the socket that just closed
    this.closeSession()
    this.turn = []
    this.turnInterrupted = false
    this.setState('reconnecting')
    let last: unknown
    for (let attempt = 0; attempt < RECONNECT_ATTEMPTS; attempt++) {
      if (attempt) await sleep(500 * 2 ** attempt)
      if (epoch !== this.epoch) return
      // A uses:1 token can only resume; without a handle (or after a failed try) mint a fresh one.
      if (attempt || !this.handle) this.token = null
      try {
        await this.connect(epoch)
        this.reconnecting = false
        // ponytail: not resent, since Gemini may have it already; the screen says it may not have arrived.
        if (unanswered) this.ev.onError('message_unsent')
        this.flush() // messages sent while it was down
        return
      } catch (e) {
        if (epoch !== this.epoch) return
        console.warn('reconnect attempt failed', e)
        last = e
        if (e instanceof Error && e.name === 'TokenError') break // signed out or refused: retrying won't help
      }
    }
    this.reconnecting = false
    this.fail(failure(last))
  }

  private onMessage(m: LiveServerMessage): void {
    // A message can carry several fields; handle each one, no early returns.
    const update = m.sessionResumptionUpdate
    if (update?.resumable && update.newHandle) this.handle = update.newHandle
    if (m.usageMetadata) {
      this.totals = addUsage(this.totals, m.usageMetadata)
      this.ev.onUsage(this.totals)
    }
    for (const id of m.toolCallCancellation?.ids ?? []) this.cancelled.add(id)
    for (const call of m.toolCall?.functionCalls ?? []) void this.runTool(call)

    const content = m.serverContent
    const heard = content?.inputTranscription?.text
    if (heard) {
      this.setTranscript(appendTranscript(this.transcript, 'user', heard))
      this.touch()
    }
    const said = content?.outputTranscription?.text
    if (said) this.setTranscript(appendTranscript(this.transcript, 'bajan', said))
    if (content?.interrupted) {
      // Gemini also interrupts a turn whose audio already finished playing; that answer was not cut short.
      const cut = this.cutOff || this.sources.size > 0
      this.cutOff = false
      this.stopPlayback()
      this.turn = []
      this.turnInterrupted = true
      this.setTranscript(closeTranscript(this.transcript, true, cut))
    }
    for (const part of content?.modelTurn?.parts ?? []) {
      const data = part.inlineData?.data
      if (!data || !part.inlineData?.mimeType?.startsWith('audio/pcm')) continue
      if (this.clip) {
        this.turnInterrupted = true // recording: the rest of this answer is only shown, not played
        continue
      }
      if (this.replaying) this.stopPlayback() // a live answer wins over a replay
      const pcm = pcm16ToFloat32(data)
      // Reported gemini-3.8-live bug: replies arrive as near-empty audio chunks. Make it visible.
      this.tinyChunks = pcm.length <= 4 ? this.tinyChunks + 1 : 0
      if (this.tinyChunks === 20) console.warn('Gemini is sending near-silent audio (known gemini-3.8-live issue)')
      this.turn.push(pcm)
      this.play(pcm)
    }
    if (content?.turnComplete) {
      this.cutOff = false
      if (!this.turnInterrupted && this.turn.length) this.lastTurn = this.turn
      this.turn = []
      this.turnInterrupted = false
      this.drops = 0
      this.setTranscript(closeTranscript(this.transcript, false))
      if (this.state === 'thinking') this.setState(this.waiting()) // answered without speaking
      this.touch()
      // On goAway, switch sockets between turns, never mid-answer or mid-tool.
      if (this.goAwayPending && !this.pendingTools) void this.reconnect()
    }
    if (m.goAway) {
      const seconds = parseFloat(m.goAway.timeLeft ?? '') // a protobuf Duration such as "10s"
      this.goAwayPending = true
      clearTimeout(this.goAwayTimer)
      this.goAwayTimer = setTimeout(() => void this.reconnect(), Math.max(0, (seconds || 5) * 1000 - 1000))
    }
  }

  private async runTool(call: FunctionCall): Promise<void> {
    const epoch = this.epoch
    const id = call.id ?? ''
    const name = call.name ?? ''
    this.pendingTools++
    this.touch()
    // The nonce keeps keys unique across sessions; Gemini call ids are only known to be unique per session.
    const key = call.id ? `${this.nonce}:${call.id}` : crypto.randomUUID()
    const result = await callTool(key, name, call.args ?? {})
    this.pendingTools = Math.max(0, this.pendingTools - 1)
    this.ev.onToolResult(name, result) // the screen always learns what the server said
    // A cancelled call or one from a replaced socket is not answered; the server state stays authoritative.
    if (epoch !== this.epoch || this.cancelled.delete(id) || !this.session) return
    const response =
      result === null
        ? { error: UNAVAILABLE[name] ?? UNKNOWN_HELP }
        : typeof result.error === 'string'
          ? { error: result.error }
          : { output: result }
    this.session.sendToolResponse({ functionResponses: [{ id, name, response }] })
  }

  private onMic(buffer: ArrayBuffer): void {
    if (this.clip) {
      this.clip.push(buffer)
      return
    }
    if (this.mode !== 'talk' || !this.open || this.replaying || !this.session) return // dropped while reconnecting or replaying
    // ponytail: sends 24 kHz and lets Gemini resample; use a 16 kHz capture context if quality suffers.
    this.session.sendRealtimeInput({ audio: { data: toBase64(buffer), mimeType: `audio/pcm;rate=${this.ctx.sampleRate}` } })
  }

  private play(pcm: Float32Array<ArrayBuffer>): void {
    const buffer = this.ctx.createBuffer(1, pcm.length, OUTPUT_RATE)
    buffer.copyToChannel(pcm, 0)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.ctx.destination)
    // Start an empty queue 100 ms ahead so network jitter doesn't cut the first words.
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.1
    src.start(this.nextTime)
    this.nextTime += buffer.duration
    this.sources.add(src)
    src.onended = () => {
      this.sources.delete(src)
      if (!this.sources.size) this.drained()
    }
    if (this.state === 'listening' || this.state === 'ready' || this.state === 'thinking') this.setState('speaking')
  }

  private stopPlayback(): void {
    for (const src of this.sources) {
      src.onended = null
      src.stop()
    }
    this.sources.clear()
    this.nextTime = this.ctx.currentTime // otherwise the next answer queues behind the cancelled one
    this.drained()
  }

  private drained(): void {
    this.replaying = false
    if (this.state === 'speaking') this.setState(this.waiting())
  }

  private closeSession(): void {
    this.open = false
    try {
      this.session?.close()
    } catch {
      // already closed
    }
    this.session = null
  }

  private fail(error: VoiceError): void {
    this.halt('error')
    this.ev.onError(error)
  }

  private setState(state: VoiceState): void {
    if (state === this.state) return
    this.state = state
    this.ev.onState(state, this.mode)
  }

  private setTranscript(entries: Entry[]): void {
    this.transcript = entries.slice(-MAX_ENTRIES)
    this.ev.onTranscript(this.transcript)
  }
}

async function fetchToken(): Promise<Token> {
  const res = await fetch('/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(10_000),
  })
  if (res.ok) return res.json()
  const error = new Error(res.status === 401 ? 'signed_out' : res.status === 403 ? 'no_profile' : 'unavailable')
  error.name = 'TokenError'
  throw error
}
