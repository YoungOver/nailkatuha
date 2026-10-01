'use client'

import { useEffect, useRef, useState } from 'react'
import { lacquerStore } from '../lacquer'
import type { FromHost, SceneKind, ToHost } from './host'
import type { NailState } from './scene'

type Send = (m: ToHost, transfer?: Transferable[]) => void

let current: Send | null = null
let queue: ToHost[] = []
const listeners = new Set<(m: FromHost) => void>()
const notify = (m: FromHost) => listeners.forEach((l) => l(m))

/* One worker (or one in-page host) for every scene on the page, created on first use. */
function channel(offscreen: boolean): Send {
  if (!current) {
    if (offscreen) {
      const worker = new Worker(new URL('./nails.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<FromHost>) => notify(e.data)
      current = (m, t = []) => worker.postMessage(m, t)
    } else {
      current = (m) => {
        queue.push(m)
      }
      import('./host').then(({ createHost }) => {
        const handle = createHost(notify, (cb) => requestAnimationFrame(cb))
        current = (m) => handle(m)
        for (const m of queue) handle(m)
        queue = []
      })
    }
  }
  return (m, t) => current!(m, t)
}

function snapshot(): NailState {
  const s = lacquerStore.get()
  return { hex: s.lacquer.hex, finish: s.finish, shape: s.shape }
}

let counter = 0

/**
 * Connects a canvas to a 3D scene in the shared host: hands the canvas to the
 * worker, forwards size, visibility, pointer and the chosen lacquer, and
 * reports when the first frame is ready. `progress` drives scroll-scrubbed scenes.
 */
export function useScene(kind: SceneKind) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const progress = useRef<(p: number) => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const id = `${kind}-${++counter}`
    lacquerStore.restore()
    const offscreen = 'transferControlToOffscreen' in canvas && typeof Worker !== 'undefined'
    const post = channel(offscreen)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const rect = () => canvas.getBoundingClientRect()
    const r = rect()
    let target: HTMLCanvasElement | OffscreenCanvas = canvas
    if (offscreen) {
      try {
        target = canvas.transferControlToOffscreen()
      } catch {
        return
      }
    }
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    post({ type: 'init', id, kind, canvas: target, w: r.width, h: r.height, dpr, still, state: snapshot() }, offscreen ? [target as OffscreenCanvas] : [])

    const onHost = (m: FromHost) => {
      if (m.id === id && m.type === 'ready') setReady(true)
    }
    listeners.add(onHost)

    const ro = new ResizeObserver(() => {
      const b = rect()
      post({ type: 'resize', id, w: b.width, h: b.height, dpr })
    })
    ro.observe(canvas)

    /* draw only while the canvas is on screen and the tab is in front */
    let inView = true
    const report = () => post({ type: 'visible', id, visible: inView && !document.hidden })
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting
      report()
    })
    io.observe(canvas)
    document.addEventListener('visibilitychange', report)

    /* pointer events are coalesced to one message per frame */
    let pending: ToHost | null = null
    let scheduled = 0
    const onMove = (e: PointerEvent) => {
      const b = rect()
      const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom
      pending = {
        type: 'pointer',
        id,
        x: (e.clientX / innerWidth) * 2 - 1,
        y: -((e.clientY / innerHeight) * 2 - 1),
        px: inside ? ((e.clientX - b.left) / b.width) * 2 - 1 : null,
        py: inside ? -(((e.clientY - b.top) / b.height) * 2 - 1) : null,
      }
      if (!scheduled)
        scheduled = requestAnimationFrame(() => {
          scheduled = 0
          if (pending) post(pending)
          pending = null
        })
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const offStore = lacquerStore.subscribe(() => post({ type: 'state', state: snapshot() }))
    progress.current = (p) => post({ type: 'progress', id, p })

    return () => {
      listeners.delete(onHost)
      offStore()
      ro.disconnect()
      io.disconnect()
      cancelAnimationFrame(scheduled)
      document.removeEventListener('visibilitychange', report)
      window.removeEventListener('pointermove', onMove)
      post({ type: 'visible', id, visible: false })
      progress.current = () => {}
    }
  }, [kind])

  return { canvasRef, ready, progress }
}
