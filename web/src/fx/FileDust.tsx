'use client'

import { useEffect, useRef } from 'react'
import { lacquerStore } from './lacquer'
import { file as fileSound } from './sound'

const INTERACTIVE = 'a, button, [role="button"], summary, label'

/*
 * The cursor itself is a native image (fx/cursor.ts). This only adds what an
 * image cannot do: when the board touches something clickable it files it,
 * leaving a pinch of dust in the lacquer colour and the sound of the file.
 * No per-frame loop: work happens on the hover event only.
 */
export function FileDust() {
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let current: Element | null = null

    const dust = (x: number, y: number) => {
      const root = layer.current
      if (!root) return
      for (let i = 0; i < 6; i++) {
        const p = document.createElement('span')
        p.className = 'file-dust'
        p.style.left = `${x}px`
        p.style.top = `${y}px`
        p.style.background = i % 2 ? lacquerStore.get().lacquer.hex : '#f5f0eb'
        root.appendChild(p)
        const a = Math.PI * (0.1 + Math.random() * 0.8)
        const d = 12 + Math.random() * 26
        p.animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.95 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0.2)`, opacity: 0 },
          ],
          { duration: 520 + Math.random() * 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        ).onfinish = () => p.remove()
      }
    }

    const onOver = (e: PointerEvent) => {
      const target = (e.target as Element).closest?.(INTERACTIVE) ?? null
      if (target === current) return
      current = target
      if (!target) return
      fileSound()
      dust(e.clientX, e.clientY)
    }

    document.addEventListener('pointerover', onOver, { passive: true })
    return () => document.removeEventListener('pointerover', onOver)
  }, [])

  return <div ref={layer} className="file-dust-layer" aria-hidden="true" />
}
