/// <reference lib="webworker" />
import { NailScene, type NailState } from './scene'

/*
 * Runs the whole hero scene off the main thread: parsing three.js, linking
 * the lacquer shader and drawing every frame happen here, so scrolling and
 * clicks on the page can never stall because of the 3D.
 */

export type ToWorker =
  | { type: 'init'; canvas: OffscreenCanvas; w: number; h: number; dpr: number; still: boolean; state: NailState }
  | { type: 'resize'; w: number; h: number; dpr: number }
  | { type: 'pointer'; x: number; y: number; px: number | null; py: number | null }
  | { type: 'state'; state: NailState }
  | { type: 'visible'; visible: boolean }

export type FromWorker = { type: 'ready' } | { type: 'slow' } | { type: 'failed' }

const post = (m: FromWorker) => (self as DedicatedWorkerGlobalScope).postMessage(m)

let scene: NailScene | null = null
let running = false
let visible = true
let last = 0
let frames = 0
let budget = 0
let dpr = 1
let size = { w: 1, h: 1 }

const raf: (cb: (t: number) => void) => void =
  typeof self.requestAnimationFrame === 'function' ? (cb) => self.requestAnimationFrame(cb) : (cb) => setTimeout(() => cb(performance.now()), 16)

function loop(now: number) {
  if (!scene || !running || !visible) return
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60
  last = now
  scene.frame(dt)
  /* one-time frame budget: if the device cannot hold ~50 fps, render at 1x pixel ratio */
  if (frames < 90) {
    budget += dt
    if (++frames === 90 && budget / 90 > 1 / 50 && dpr > 1) {
      dpr = 1
      scene.resize(size.w, size.h, dpr)
      post({ type: 'slow' })
    }
  }
  raf(loop)
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data
  switch (m.type) {
    case 'init':
      dpr = m.dpr
      size = { w: m.w, h: m.h }
      try {
        scene = new NailScene(m.canvas, m.w, m.h, m.dpr, m.state, m.still)
      } catch {
        /* no WebGL on this device: the page keeps its glow and the picker still repaints the site */
        post({ type: 'failed' })
        break
      }
      scene.compile().then(() => {
        running = true
        last = 0
        raf(loop)
        post({ type: 'ready' })
      })
      break
    case 'resize':
      size = { w: m.w, h: m.h }
      dpr = Math.min(dpr, m.dpr)
      scene?.resize(m.w, m.h, dpr)
      break
    case 'pointer':
      scene?.setPointer(m.x, m.y)
      scene?.pick(m.px, m.py)
      break
    case 'state':
      scene?.setState(m.state)
      break
    case 'visible': {
      const resume = !visible && m.visible
      visible = m.visible
      if (resume && running) {
        last = 0
        raf(loop)
      }
      break
    }
  }
}
