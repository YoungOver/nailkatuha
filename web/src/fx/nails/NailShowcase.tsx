'use client'

import { useEffect, useRef } from 'react'
import { lacquerStore } from '../lacquer'
import type { FromWorker, ToWorker } from './nails.worker'
import type { NailState } from './scene'

function snapshot(): NailState {
  const s = lacquerStore.get()
  return { hex: s.lacquer.hex, finish: s.finish, shape: s.shape }
}

/*
 * The page side of the hero scene. With OffscreenCanvas the canvas is handed
 * to a worker and this component only forwards the pointer, the chosen
 * lacquer and visibility; without it the same scene runs here as a fallback.
 */
export default function NailShowcase({ onReady }: { onReady?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /* kept in a ref: a new callback from the parent must not restart the worker */
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    lacquerStore.restore()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const rect = () => canvas.getBoundingClientRect()
    let send: (m: ToWorker, transfer?: Transferable[]) => void = () => {}
    let cleanup = () => {}

    if ('transferControlToOffscreen' in canvas && typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('./nails.worker.ts', import.meta.url), { type: 'module' })
      send = (m, transfer = []) => worker.postMessage(m, transfer)
      worker.onmessage = (e: MessageEvent<FromWorker>) => {
        if (e.data.type === 'ready') readyRef.current?.()
      }
      const offscreen = canvas.transferControlToOffscreen()
      const r = rect()
      send({ type: 'init', canvas: offscreen, w: r.width, h: r.height, dpr, state: snapshot() }, [offscreen])
      cleanup = () => worker.terminate()
    } else {
      let raf = 0
      let alive = true
      import('./scene').then(({ NailScene }) => {
        if (!alive) return
        const r = rect()
        const scene = new NailScene(canvas, r.width, r.height, dpr, snapshot())
        let visible = true
        let last = 0
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop)
          if (!visible) return
          scene.frame(last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60)
          last = now
        }
        scene.compile().then(() => {
          raf = requestAnimationFrame(loop)
          readyRef.current?.()
        })
        send = (m) => {
          if (m.type === 'resize') scene.resize(m.w, m.h, m.dpr)
          if (m.type === 'pointer') {
            scene.setPointer(m.x, m.y)
            scene.pick(m.px, m.py)
          }
          if (m.type === 'state') scene.setState(m.state)
          if (m.type === 'visible') visible = m.visible
        }
        cleanup = () => {
          cancelAnimationFrame(raf)
          scene.dispose()
        }
      })
      cleanup = () => {
        alive = false
        cancelAnimationFrame(raf)
      }
    }

    const ro = new ResizeObserver(() => {
      const r = rect()
      send({ type: 'resize', w: r.width, h: r.height, dpr })
    })
    ro.observe(canvas)

    const io = new IntersectionObserver(([e]) => send({ type: 'visible', visible: e.isIntersecting }))
    io.observe(canvas)
    const onVisibility = () => send({ type: 'visible', visible: !document.hidden })
    document.addEventListener('visibilitychange', onVisibility)

    /* pointer events are coalesced to one message per frame */
    let pending: ToWorker | null = null
    let scheduled = 0
    const onMove = (e: PointerEvent) => {
      const r = rect()
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      pending = {
        type: 'pointer',
        x: (e.clientX / innerWidth) * 2 - 1,
        y: -((e.clientY / innerHeight) * 2 - 1),
        px: inside ? ((e.clientX - r.left) / r.width) * 2 - 1 : null,
        py: inside ? -(((e.clientY - r.top) / r.height) * 2 - 1) : null,
      }
      if (!scheduled)
        scheduled = requestAnimationFrame(() => {
          scheduled = 0
          if (pending) send(pending)
          pending = null
        })
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const offStore = lacquerStore.subscribe(() => send({ type: 'state', state: snapshot() }))

    return () => {
      offStore()
      ro.disconnect()
      io.disconnect()
      cancelAnimationFrame(scheduled)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onMove)
      cleanup()
    }
  }, [])

  return <canvas ref={canvasRef} className="showcase__canvas" />
}
