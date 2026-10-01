import { LayersScene } from './layers'
import { NailScene, type NailState } from './scene'

export type SceneKind = 'set' | 'layers'

export type ToHost =
  | { type: 'init'; id: string; kind: SceneKind; canvas: HTMLCanvasElement | OffscreenCanvas; w: number; h: number; dpr: number; still: boolean; state: NailState }
  | { type: 'resize'; id: string; w: number; h: number; dpr: number }
  | { type: 'pointer'; id: string; x: number; y: number; px: number | null; py: number | null }
  | { type: 'state'; state: NailState }
  | { type: 'visible'; id: string; visible: boolean }
  | { type: 'progress'; id: string; p: number }

export type FromHost = { type: 'ready' | 'slow' | 'failed'; id: string }

type Entry = {
  scene: NailScene | LayersScene
  running: boolean
  visible: boolean
  frames: number
  budget: number
  dpr: number
  w: number
  h: number
}

/**
 * Owns every 3D scene of the page and one render loop for all of them. Runs
 * inside the worker (one copy of three.js for the hero set and the layers) and,
 * where OffscreenCanvas is missing, on the page itself.
 */
export function createHost(post: (m: FromHost) => void, raf: (cb: (t: number) => void) => void) {
  const entries = new Map<string, Entry>()
  let looping = false
  let last = 0

  const loop = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60
    last = now
    let any = false
    for (const [id, e] of entries) {
      if (!e.running || !e.visible) continue
      any = true
      e.scene.frame(dt)
      /* one-time frame budget per scene: if it cannot hold ~50 fps, render at 1x pixel ratio */
      if (e.frames < 90) {
        e.budget += dt
        if (++e.frames === 90 && e.budget / 90 > 1 / 50 && e.dpr > 1) {
          e.dpr = 1
          e.scene.resize(e.w, e.h, 1)
          post({ type: 'slow', id })
        }
      }
    }
    if (any) raf(loop)
    else {
      looping = false
      last = 0
    }
  }

  const kick = () => {
    if (looping) return
    looping = true
    last = 0
    raf(loop)
  }

  return (m: ToHost) => {
    switch (m.type) {
      case 'init': {
        let scene: NailScene | LayersScene
        try {
          scene = m.kind === 'layers' ? new LayersScene(m.canvas, m.w, m.h, m.dpr, m.state) : new NailScene(m.canvas, m.w, m.h, m.dpr, m.state, m.still)
        } catch {
          /* no WebGL on this device: the page keeps its placeholder glow */
          post({ type: 'failed', id: m.id })
          return
        }
        const entry: Entry = { scene, running: false, visible: true, frames: 0, budget: 0, dpr: m.dpr, w: m.w, h: m.h }
        entries.set(m.id, entry)
        scene.compile().then(() => {
          entry.running = true
          kick()
          post({ type: 'ready', id: m.id })
        })
        return
      }
      case 'resize': {
        const e = entries.get(m.id)
        if (!e) return
        e.w = m.w
        e.h = m.h
        e.dpr = Math.min(e.dpr, m.dpr)
        e.scene.resize(m.w, m.h, e.dpr)
        return
      }
      case 'pointer': {
        const e = entries.get(m.id)
        e?.scene.setPointer(m.x, m.y)
        e?.scene.pick(m.px, m.py)
        return
      }
      case 'state':
        for (const e of entries.values()) e.scene.setState(m.state)
        return
      case 'progress': {
        const e = entries.get(m.id)
        if (e && e.scene instanceof LayersScene) e.scene.setProgress(m.p)
        return
      }
      case 'visible': {
        const e = entries.get(m.id)
        if (!e) return
        e.visible = m.visible
        if (m.visible) kick()
        return
      }
    }
  }
}
