/// <reference lib="webworker" />
import { FlowRenderer, type FlowState } from './flowgl'

export type ToFlow =
  | { type: 'init'; canvas: OffscreenCanvas; w: number; h: number; slow: boolean; state: FlowState }
  | { type: 'resize'; w: number; h: number }
  | { type: 'state'; state: Partial<FlowState> }
  | { type: 'visible'; visible: boolean }

let flow: FlowRenderer | null = null
let visible = true
let slow = false
let clock = 0
let last = 0
let skip = false

const raf: (cb: (t: number) => void) => void =
  typeof self.requestAnimationFrame === 'function' ? (cb) => self.requestAnimationFrame(cb) : (cb) => setTimeout(() => cb(performance.now()), 33)

/* 30 fps is plenty for a slow pour and halves the GPU time */
function loop(now: number) {
  if (!flow || !visible) return
  raf(loop)
  skip = !skip
  if (skip) return
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 30
  last = now
  clock += dt * (slow ? 0.18 : 1)
  flow.draw(clock, dt)
}

self.onmessage = (e: MessageEvent<ToFlow>) => {
  const m = e.data
  if (m.type === 'init') {
    slow = m.slow
    try {
      flow = new FlowRenderer(m.canvas, m.state)
    } catch {
      return
    }
    flow.resize(m.w, m.h)
    raf(loop)
  } else if (m.type === 'resize') {
    flow?.resize(m.w, m.h)
  } else if (m.type === 'state') {
    flow?.set(m.state)
  } else if (m.type === 'visible') {
    const resume = !visible && m.visible
    visible = m.visible
    if (resume && flow) {
      last = 0
      raf(loop)
    }
  }
}
