'use client'

import { useEffect, useRef } from 'react'
import { file as fileSound } from './sound'

const INTERACTIVE = 'a, button, [role="button"], summary, label'
const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]'

/*
 * The cursor is an emery board. Its tip sits exactly under the pointer (no
 * spring: a cursor that trails the hand reads as lag); only the lean follows
 * horizontal speed. On something clickable it files it: a short oscillation
 * along its own axis, a pinch of dust and the filing sound.
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

    const pos = { x: innerWidth / 2, y: innerHeight / 2 }
    let speedX = 0
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
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - prev) / 1000, 1 / 30)
      prev = now
      speedX *= Math.exp(-dt * 10)
      const lean = Math.max(-22, Math.min(22, speedX * 0.02))
      angle += (-38 + lean - angle) * Math.min(1, dt * 14)
      const saw = filing ? Math.sin(now / 38) * 5 : 0
      root.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${angle}deg) translateY(${saw}px)`

      if (filing && now - lastDust > 140 && Math.abs(speedX) < 900) {
        lastDust = now
        dust(pos.x, pos.y)
      }
    }

    let lastT = 0
    const onMove = (e: PointerEvent) => {
      const dtMove = (e.timeStamp - lastT) / 1000
      if (!hidden && dtMove > 0 && dtMove < 0.1) speedX = speedX * 0.6 + ((e.clientX - pos.x) / dtMove) * 0.4
      lastT = e.timeStamp
      pos.x = e.clientX
      pos.y = e.clientY
      if (hidden) {
        hidden = false
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
