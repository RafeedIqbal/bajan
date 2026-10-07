'use client'

import { useEffect, useRef, useState } from 'react'
import type { VoiceState } from '@/lib/live'
import still from './avatar.webp'

const SETTLE_MS = 400 // a short gap between audio chunks must not flip him back to idle mid-sentence

// Bajan's face. Both clips (Higgsfield, see README) start and end on the still, so they swap without a jump.
// While he speaks, the talking clip loops; when he stops (and on load) the idle clip plays once and rests on
// the still, so nothing moves for long while he waits (WCAG 2.2.2). Reduced motion or data saver: still only.
// ponytail: the talking loop is not synced to his words.
export default function Avatar({ state, recording }: { state: VoiceState; recording: boolean }) {
  const idle = useRef<HTMLVideoElement>(null)
  const talking = useRef<HTMLVideoElement>(null)
  const [motion, setMotion] = useState(false) // decided after mount: the server can't know the user's settings
  const [talk, setTalk] = useState(false)
  const speaking = state === 'speaking'

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true
    const update = () => setMotion(!reduce.matches && !saveData)
    update()
    reduce.addEventListener('change', update)
    return () => reduce.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (speaking) return setTalk(true)
    const timer = setTimeout(() => setTalk(false), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [speaking])

  useEffect(() => {
    const [show, hide] = talk ? [talking.current, idle.current] : [idle.current, talking.current]
    hide?.pause()
    if (!show) return
    if (!motion) return show.pause()
    show.currentTime = 0
    show.play().catch(() => {}) // e.g. iOS Low Power Mode refuses: the still stays
  }, [talk, motion])

  return (
    <div className="stage" data-state={recording ? 'recording' : state} data-talking={talk && motion ? '' : undefined} aria-hidden="true">
      <video ref={idle} src="/avatar/idle.mp4" poster={still.src} muted playsInline preload={motion ? 'auto' : 'none'} />
      <video ref={talking} className="talking" src="/avatar/talking.mp4" poster={still.src} muted playsInline loop preload={motion ? 'auto' : 'none'} />
      <span className="dots">
        <i />
        <i />
        <i />
      </span>
    </div>
  )
}
