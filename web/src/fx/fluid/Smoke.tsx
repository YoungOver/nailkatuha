'use client'

import { useEffect, useRef, useState } from 'react'
import { NEON, smokeBus } from './bus'
import { detectDevice, pickQuality, QUALITY } from './quality'
import { FluidSim, type Rgb } from './sim'

const DYE = 0.2

function scaled([r, g, b]: Rgb, k: number): Rgb {
  return [r * k, g * k, b * k]
}

export function Smoke({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let sim: FluidSim
    try {
      sim = new FluidSim(canvas, QUALITY[pickQuality(detectDevice())])
    } catch {
      setFallback(true)
      return
    }

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)
    const measure = () => {
      const r = canvas.getBoundingClientRect()
      sim.resize(r.width, r.height, dpr())
    }
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(canvas)
    let orientationTimer = 0
    const onOrientation = () => {
      window.clearTimeout(orientationTimer)
      orientationTimer = window.setTimeout(measure, 180)
    }
    window.addEventListener('orientationchange', onOrientation)

    let colorIndex = 0
    const nextColor = () => NEON[colorIndex++ % NEON.length]

    const burst = (count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 260 + Math.random() * 420
        sim.splat(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7, Math.cos(angle) * speed, Math.sin(angle) * speed, scaled(nextColor(), DYE * 1.4))
      }
    }
    burst(6)

    const last = { x: 0, y: 0, t: 0 }
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      if (x < 0 || x > 1 || y < 0 || y > 1) return
      if (last.t && e.timeStamp - last.t < 64) {
        const dx = e.clientX - last.x
        const dy = e.clientY - last.y
        if (dx * dx + dy * dy > 4) sim.splat(x, y, dx, dy, scaled(nextColor(), DYE * 0.55))
      }
      last.x = e.clientX
      last.y = e.clientY
      last.t = e.timeStamp
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    const offBus = smokeBus.on((s) => sim.splat(s.x, s.y, s.dx, s.dy, scaled(s.color ?? nextColor(), DYE * 0.5)))

    let visible = true
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) schedule()
    })
    io.observe(canvas)

    let raf = 0
    let prev = performance.now()
    let nextAuto = prev + 1200
    const frame = (now: number) => {
      raf = 0
      const dt = Math.min((now - prev) / 1000, 1 / 30)
      prev = now
      if (now > nextAuto) {
        burst(1 + Math.round(Math.random()))
        nextAuto = now + 1800 + Math.random() * 1200
      }
      sim.step(dt)
      sim.render()
      schedule()
    }
    const schedule = () => {
      if (!raf && visible && !document.hidden) {
        prev = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    const onVisibility = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : schedule())
    document.addEventListener('visibilitychange', onVisibility)
    schedule()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      offBus()
      window.clearTimeout(orientationTimer)
      window.removeEventListener('orientationchange', onOrientation)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      sim.dispose()
    }
  }, [])

  return (
    <div className={`smoke ${className}`} aria-hidden="true" data-fallback={fallback || undefined}>
      {!fallback && <canvas ref={canvasRef} />}
    </div>
  )
}
