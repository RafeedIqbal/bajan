// Browser side of the Gemini Live conversation: mic capture, playback, reconnects, tool relay, Repeat,
// idle stop and usage tally. Erasable TypeScript only, so `node --test` can import it (lib/checks.test.ts).
import {
  GoogleGenAI,
  MediaModality,
  type FunctionCall,
  type LiveConnectConfig,
  type LiveServerMessage,
  type ModalityTokenCount,
  type Session,
  type UsageMetadata,
} from '@google/genai'

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'reconnecting' | 'error'
export type ToolResult = Record<string, unknown>
export type UsageTotals = { audioIn: number; textIn: number; audioOut: number; textOut: number; usd: number }

type Token = { token: string; model: string; apiVersion: string; config: LiveConnectConfig }
type Events = {
  onState: (state: VoiceState) => void
  onUsage: (totals: UsageTotals) => void
  onToolResult: (name: string, result: ToolResult | null) => void // null: the server could not be reached
  onError: (message: string) => void
  onIdleStop: () => void
  onAudioBlocked: () => void
}

const OUTPUT_RATE = 24000 // Gemini always replies with 24 kHz PCM16
const IDLE_MS = 3 * 60_000
const CONNECT_TIMEOUT_MS = 15_000
const RECONNECT_ATTEMPTS = 5 // waits of 1, 2, 4 and 8 s: rides out ~15 s offline (network handoffs)
const MAX_DROPS = 3 // closes in a row without a completed turn before giving up
const UNKNOWN_HELP =
  'status_unknown: the help request may have been placed. Do not say it failed. Tell the user you are checking, then call check_help_status. If it stays unknown, tell the user to phone the caregiver directly, or 999 in an emergency.'
const UNAVAILABLE: Record<string, string> = {
  get_profile: 'profile_unavailable: say you cannot read the records right now; do not guess.',
  check_help_status: 'status_unavailable: say you cannot check right now; do not guess the call status.',
}
const MSG_OFFLINE = 'সংযোগ হয়নি। ইন্টারনেট দেখে আবার "শুরু করুন" চাপুন।'

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

// Plain-language message for a failed start or reconnect.
function failureMessage(e: unknown): string {
  if (e instanceof Error && e.name === 'TokenError') return e.message
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError') return 'মাইক্রোফোন চালুর অনুমতি দিন, তারপর আবার "শুরু করুন" চাপুন।'
  if (name === 'NotFoundError') return 'কোনো মাইক্রোফোন পাওয়া যায়নি।'
  if (name === 'NotReadableError') return 'মাইক্রোফোন এখন অন্য কোথাও ব্যবহার হচ্ছে।'
  return MSG_OFFLINE
}

export class LiveVoice {
  readonly ctx: AudioContext
  private ev: Events
  private state: VoiceState = 'idle'
  private epoch = 0 // bumped on every start, reconnect and stop; callbacks from older sockets are ignored
  private session: Session | null = null
  private open = false
  private token: Token | null = null
  private handle: string | null = null
  private nonce = ''
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private capture: AudioWorkletNode | null = null // created once; sessions only (dis)connect their mic source
  private worklet: Promise<void> | null = null
  private sources = new Set<AudioBufferSourceNode>()
  private nextTime = 0
  private turn: Float32Array<ArrayBuffer>[] = []
  private turnInterrupted = false
  private lastTurn: Float32Array<ArrayBuffer>[] = []
  private replaying = false
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
      if (this.open && ctx.state !== 'running') ev.onAudioBlocked()
    }
  }

  // Call synchronously from a tap (or after a tap unlocked audio): resumes audio before any await.
  // `before` lets the caller release the mic first (the wake-word recognizer).
  async start(before?: Promise<void>): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'error') return // one session at a time
    const epoch = ++this.epoch
    const resumed = this.ctx.resume()
    this.setState('connecting')
    this.totals = ZERO_USAGE
    this.ev.onUsage(this.totals)
    this.nonce = crypto.randomUUID()
    this.token = null
    this.handle = null
    this.drops = 0
    try {
      await before
      if (epoch !== this.epoch) return
      if (!navigator.mediaDevices) throw new Error('insecure context')
      const stream = await this.openMic()
      if (epoch !== this.epoch) return stream.getTracks().forEach((t) => t.stop())
      this.stream = stream
      stream.getAudioTracks()[0]?.addEventListener('ended', () => {
        if (this.stream === stream) this.fail('মাইক্রোফোন বন্ধ হয়ে গেছে। আবার "শুরু করুন" চাপুন।')
      })
      await resumed
      this.worklet ??= this.loadWorklet()
      await this.worklet
      if (epoch !== this.epoch) return
      if (!this.capture) {
        this.capture = new AudioWorkletNode(this.ctx, 'pcm-capture')
        this.capture.port.onmessage = (e: MessageEvent<ArrayBuffer>) => this.sendAudio(e.data)
        this.capture.connect(this.ctx.destination) // outputs silence; keeps the worklet running
      }
      this.source = this.ctx.createMediaStreamSource(stream)
      this.source.connect(this.capture)
      await this.connect(epoch)
      // The user's spoken "ভাইজান" never reaches Gemini (Start tap or browser wake word), so say it for them.
      this.session?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'ভাইজান' }] }], turnComplete: true })
    } catch (e) {
      if (epoch !== this.epoch) return
      console.error('voice start failed', e)
      this.fail(failureMessage(e))
    }
  }

  stop(next: VoiceState = 'idle'): void {
    this.epoch++
    clearTimeout(this.idleTimer)
    clearTimeout(this.goAwayTimer)
    this.closeSession()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.source?.disconnect()
    this.source = null
    this.stopPlayback()
    this.turn = []
    this.turnInterrupted = false
    this.lastTurn = []
    this.cancelled.clear()
    this.pendingTools = 0
    this.reconnecting = this.goAwayPending = false
    this.token = this.handle = null
    void this.ctx.suspend()
    if (this.totals.usd > 0) console.info('Gemini session usage', this.totals)
    this.setState(next)
  }

  // Replays the last answer locally: no tokens, and the mic is paused so Gemini does not hear it.
  repeat(): void {
    if (!this.open || !this.lastTurn.length || this.sources.size || this.turn.length) return
    this.replaying = true
    this.session?.sendRealtimeInput({ audioStreamEnd: true })
    for (const pcm of this.lastTurn) this.play(pcm)
    this.touch()
  }

  // Any user activity keeps the session from idling out.
  touch(): void {
    if (this.state === 'idle' || this.state === 'error') return
    clearTimeout(this.idleTimer)
    // ponytail: model turns stand in for user speech (no input transcription); this bounds false wakes
    // and forgotten sessions, which Gemini 3.8 bills for the whole time it listens.
    this.idleTimer = setTimeout(() => {
      this.stop()
      this.ev.onIdleStop()
    }, IDLE_MS)
  }

  // Resolves true if audio is running again (iOS may refuse while a phone call holds the audio session).
  async resumeAudio(): Promise<boolean> {
    await this.ctx.resume().catch(() => {})
    return this.ctx.state === 'running'
  }

  private async openMic(): Promise<MediaStream> {
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
      config: { ...t.config, sessionResumption: this.handle ? { handle: this.handle } : {} },
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
    this.setState(this.sources.size ? 'speaking' : 'listening')
    if (this.ctx.state !== 'running') this.ev.onAudioBlocked()
    this.touch()
  }

  // Resume after a drop or a goAway: same token + handle first, then a fresh token.
  private async reconnect(): Promise<void> {
    if (this.reconnecting || this.state === 'idle' || this.state === 'error') return
    if (++this.drops > MAX_DROPS) return this.fail(MSG_OFFLINE) // the server keeps closing: don't loop
    this.reconnecting = true
    this.goAwayPending = false
    clearTimeout(this.goAwayTimer)
    const epoch = ++this.epoch // the old socket's callbacks are now ignored
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
        return
      } catch (e) {
        if (epoch !== this.epoch) return
        console.warn('reconnect attempt failed', e)
        last = e
        if (e instanceof Error && e.name === 'TokenError') break // signed out or refused: retrying won't help
      }
    }
    this.reconnecting = false
    this.fail(failureMessage(last))
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
    if (content?.interrupted) {
      this.stopPlayback()
      this.turn = []
      this.turnInterrupted = true
    }
    for (const part of content?.modelTurn?.parts ?? []) {
      const data = part.inlineData?.data
      if (!data || !part.inlineData?.mimeType?.startsWith('audio/pcm')) continue
      if (this.replaying) this.stopPlayback() // a live answer wins over a replay
      const pcm = pcm16ToFloat32(data)
      // Reported gemini-3.8-live bug: replies arrive as near-empty audio chunks. Make it visible.
      this.tinyChunks = pcm.length <= 4 ? this.tinyChunks + 1 : 0
      if (this.tinyChunks === 20) console.warn('Gemini is sending near-silent audio (known gemini-3.8-live issue)')
      this.turn.push(pcm)
      this.play(pcm)
    }
    if (content?.turnComplete) {
      if (!this.turnInterrupted && this.turn.length) this.lastTurn = this.turn
      this.turn = []
      this.turnInterrupted = false
      this.drops = 0
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

  private sendAudio(buffer: ArrayBuffer): void {
    if (!this.open || this.replaying || !this.session) return // dropped while reconnecting or replaying
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
    if (this.state === 'listening') this.setState('speaking')
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
    if (this.state === 'speaking') this.setState('listening')
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

  private fail(message: string): void {
    this.stop('error')
    this.ev.onError(message)
  }

  private setState(state: VoiceState): void {
    if (state === this.state) return
    this.state = state
    this.ev.onState(state)
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
  const error = new Error(
    res.status === 401
      ? 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি নতুন করে খুলে আবার সাইন ইন করুন।'
      : res.status === 403
        ? 'প্রোফাইল পাওয়া যায়নি। পাতাটি নতুন করে খুলুন।'
        : 'ভাইজান এখন সাড়া দিচ্ছেন না। একটু পরে আবার "শুরু করুন" চাপুন।'
  )
  error.name = 'TokenError'
  throw error
}
