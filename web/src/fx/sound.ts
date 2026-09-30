/*
 * Every sound is synthesised on the fly with Web Audio: no files to download,
 * and nothing plays until the visitor turns sound on (browsers block audio
 * before a gesture anyway, and sudden noise on a salon site is rude).
 */

const KEY = 'nailkatuha:sound'
type Listener = (on: boolean) => void

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null
let enabled = false
let lastFile = 0
const listeners = new Set<Listener>()

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function soundEnabled() {
  return enabled
}

export function setSound(on: boolean) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {}
  if (on) click()
  for (const l of listeners) l(on)
}

export function onSoundChange(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function restoreSound() {
  try {
    enabled = localStorage.getItem(KEY) === '1'
  } catch {
    enabled = false
  }
  return enabled
}

/** Three quick strokes of an emery board: band-passed noise with a rhythmic envelope. */
export function file() {
  if (!enabled) return
  const now = performance.now()
  if (now - lastFile < 260) return
  lastFile = now
  const a = audio()
  const src = a.createBufferSource()
  src.buffer = noise
  const band = a.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 3200 + Math.random() * 900
  band.Q.value = 0.9
  const gain = a.createGain()
  const t = a.currentTime
  gain.gain.setValueAtTime(0, t)
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.075
    gain.gain.linearRampToValueAtTime(0.09, s + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.004, s + 0.065)
  }
  src.connect(band).connect(gain).connect(a.destination)
  src.start(t, Math.random() * 0.5, 0.26)
}

/** The cap of a polish bottle: a short falling tone over a noise tick. */
export function click() {
  if (!enabled) return
  const a = audio()
  const t = a.currentTime
  const osc = a.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(2100, t)
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.04)
  const gain = a.createGain()
  gain.gain.setValueAtTime(0.12, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + 0.07)
}

/** A UV lamp warming up: low hum with a slow swell, used when a booking is confirmed. */
export function lamp() {
  if (!enabled) return
  const a = audio()
  const t = a.currentTime
  const gain = a.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.05, t + 0.5)
  gain.gain.setValueAtTime(0.05, t + 1.4)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2)
  gain.connect(a.destination)
  for (const f of [100, 200, 301]) {
    const osc = a.createOscillator()
    osc.frequency.value = f
    const g = a.createGain()
    g.gain.value = f === 100 ? 1 : 0.35
    osc.connect(g).connect(gain)
    osc.start(t)
    osc.stop(t + 2.3)
  }
}
