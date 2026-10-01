'use client'

import { useEffect, useRef } from 'react'
import { lacquerStore } from '../lacquer'
import type { ToFlow } from './flow.worker'
import { FlowRenderer, hexToRgb, partner, type FlowState } from './flowgl'

/* the coat is drawn at a third of the screen resolution and stretched: it is soft anyway and costs a ninth */
const SCALE = 1 / 3

/* bright behind the first screen, quieter under the reading sections */
function dimFor(y: number) {
  const t = Math.min(1, y / (innerHeight * 1.1))
  return 1 - t * 0.55
}

function current(): FlowState {
  const hex = lacquerStore.get().lacquer.hex
  return { a: hexToRgb(hex), b: partner(hex), dim: dimFor(window.scrollY), pointer: [0.5, 0.5] }
}

/**
 * Fixed full-screen background of slowly flowing lacquer in the chosen shade.
 * Runs in a worker on an OffscreenCanvas; without one it runs here; without
 * WebGL2 the CSS gradient under the canvas stays.
 */
export function Flow() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    lacquerStore.restore()
    const slow = matchMedia('(prefers-reduced-motion: reduce)').matches
    /* the canvas is 100lvh tall in CSS, so its box does not change when a phone's address bar slides away */
    const size = () => ({ w: canvas.clientWidth * SCALE, h: canvas.clientHeight * SCALE })
    let send: (m: ToFlow, t?: Transferable[]) => void = () => {}
    let stop = () => {}

    if ('transferControlToOffscreen' in canvas && typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('./flow.worker.ts', import.meta.url), { type: 'module' })
      send = (m, t = []) => worker.postMessage(m, t)
      const off = canvas.transferControlToOffscreen()
      send({ type: 'init', canvas: off, ...size(), slow, state: current() }, [off])
      stop = () => worker.terminate()
    } else {
      let flow: FlowRenderer
      try {
        flow = new FlowRenderer(canvas, current())
      } catch {
        return
      }
      flow.resize(size().w, size().h)
      let raf = 0
      let clock = 0
      let last = 0
      let visible = true
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop)
        if (!visible) return
        const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60
        last = now
        clock += dt * (slow ? 0.18 : 1)
        flow.draw(clock, dt)
      }
      raf = requestAnimationFrame(loop)
      send = (m) => {
        if (m.type === 'resize') {
          flow.resize(m.w, m.h)
          flow.draw(clock, 0)
        }
        if (m.type === 'state') flow.set(m.state)
        if (m.type === 'visible') visible = m.visible
      }
      stop = () => cancelAnimationFrame(raf)
    }
    canvas.dataset.ready = ''

    let last = size()
    const onResize = () => {
      const next = size()
      if (Math.abs(next.w - last.w) < 1 && Math.abs(next.h - last.h) < 1) return
      last = next
      send({ type: 'resize', ...next })
    }
    const resizes = new ResizeObserver(onResize)
    resizes.observe(canvas)
    let ticking = 0
    const onScroll = () => {
      if (ticking) return
      ticking = requestAnimationFrame(() => {
        ticking = 0
        send({ type: 'state', state: { dim: dimFor(window.scrollY) } })
      })
    }
    let pending: [number, number] | null = null
    let moving = 0
    const onMove = (e: PointerEvent) => {
      pending = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]
      if (!moving)
        moving = requestAnimationFrame(() => {
          moving = 0
          if (pending) send({ type: 'state', state: { pointer: pending } })
        })
    }
    const onVisibility = () => send({ type: 'visible', visible: !document.hidden })
    const offStore = lacquerStore.subscribe((s) => send({ type: 'state', state: { a: hexToRgb(s.lacquer.hex), b: partner(s.lacquer.hex) } }))

    window.addEventListener('scroll', onScroll, { passive: true })
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      offStore()
      resizes.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(ticking)
      cancelAnimationFrame(moving)
      stop()
    }
  }, [])

  return <canvas ref={ref} className="flow" aria-hidden="true" />
}
