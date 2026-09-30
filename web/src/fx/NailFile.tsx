'use client'

import { useEffect, useRef } from 'react'
import { smokeBus } from './fluid/bus'
import { rgb01 } from './lacquer'
import { file as fileSound } from './sound'

const INTERACTIVE = 'a, button, [role="button"], summary, label'
const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]'

/*
 * The cursor is an emery board. It trails the pointer on a critically damped
 * spring, leans with horizontal speed, and when it rests on something
 * clickable it files it: a short oscillation along its own axis, a pinch of
 * dust and the filing sound.
 */
export function NailFile() {
  const rootRef = useRef<HTMLDivElement>(null)
  const dustRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine = matchMedia('(hover: hover) and (pointer: fine)')
    if (!fine.matches) return
    const root = rootRef.current!
    const dustLayer = dustRef.current!
    document.documentElement.classList.add('has-file-cursor')

    const target = { x: innerWidth / 2, y: innerHeight / 2 }
    const pos = { ...target }
    const vel = { x: 0, y: 0 }
    let angle = -38
    let filing = false
    let hidden = true
    let lastDust = 0
    let raf = 0
    let prev = performance.now()

    const dust = (x: number, y: number) => {
      const color = getComputedStyle(document.documentElement).getPropertyValue('--lacquer').trim() || '#ff4f8b'
      for (let i = 0; i < 5; i++) {
        const p = document.createElement('span')
        p.className = 'file-dust'
        p.style.left = `${x}px`
        p.style.top = `${y}px`
        p.style.background = i % 2 ? color : '#f3ede7'
        dustLayer.appendChild(p)
        const a = Math.PI * (0.15 + Math.random() * 0.7)
        const d = 14 + Math.random() * 26
        p.animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0.2)`, opacity: 0 },
          ],
          { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        ).onfinish = () => p.remove()
      }
      const [r, g, b] = rgb01(color.startsWith('#') ? color : '#ff4f8b')
      smokeBus.emit({ x: x / innerWidth, y: y / innerHeight, dx: (Math.random() - 0.5) * 30, dy: -20, color: [r, g, b] })
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - prev) / 1000, 1 / 30)
      prev = now
      const k = 520
      const c = 2 * Math.sqrt(k)
      vel.x += ((target.x - pos.x) * k - vel.x * c) * dt
      vel.y += ((target.y - pos.y) * k - vel.y * c) * dt
      pos.x += vel.x * dt
      pos.y += vel.y * dt

      const lean = Math.max(-22, Math.min(22, vel.x * 0.02))
      angle += (-38 + lean - angle) * Math.min(1, dt * 12)
      const saw = filing ? Math.sin(now / 38) * 5 : 0
      root.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${angle}deg) translateY(${saw}px)`

      if (filing && now - lastDust > 140 && Math.abs(vel.x) + Math.abs(vel.y) < 900) {
        lastDust = now
        dust(pos.x, pos.y)
      }
    }

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (hidden) {
        hidden = false
        pos.x = target.x
        pos.y = target.y
        root.dataset.visible = ''
      }
    }

    const onOver = (e: PointerEvent) => {
      const el = e.target as Element
      const textEntry = !!el.closest?.(TEXT_ENTRY)
      root.toggleAttribute('data-text', textEntry)
      const next = !textEntry && !!el.closest?.(INTERACTIVE)
      if (next && !filing) fileSound()
      filing = next
      root.toggleAttribute('data-filing', filing)
    }

    const onLeave = () => {
      hidden = true
      delete root.dataset.visible
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.documentElement.classList.remove('has-file-cursor')
    }
  }, [])

  return (
    <>
      <div ref={dustRef} className="file-dust-layer" aria-hidden="true" />
      <div ref={rootRef} className="nail-file" aria-hidden="true">
        <svg viewBox="0 0 16 96" width="16" height="96">
          <defs>
            <pattern id="grit" width="3" height="3" patternUnits="userSpaceOnUse">
              <circle cx="0.8" cy="0.8" r="0.45" fill="rgb(255 255 255 / 0.35)" />
              <circle cx="2.2" cy="2.1" r="0.35" fill="rgb(0 0 0 / 0.25)" />
            </pattern>
            <clipPath id="board">
              <rect x="1" y="1" width="14" height="94" rx="7" />
            </clipPath>
          </defs>
          <g clipPath="url(#board)">
            <rect x="0" y="0" width="16" height="48" className="nail-file__top" />
            <rect x="0" y="48" width="16" height="48" className="nail-file__bottom" />
            <rect x="0" y="0" width="16" height="96" fill="url(#grit)" />
            <rect x="0" y="46.5" width="16" height="3" fill="rgb(13 11 16 / 0.55)" />
            <rect x="2.5" y="4" width="2" height="88" rx="1" fill="rgb(255 255 255 / 0.25)" />
          </g>
          <rect x="1" y="1" width="14" height="94" rx="7" fill="none" stroke="rgb(13 11 16 / 0.6)" strokeWidth="1" />
        </svg>
      </div>
    </>
  )
}
