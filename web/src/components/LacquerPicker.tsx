'use client'

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { applyLacquer, LACQUERS, savedLacquer } from '@/fx/lacquer'
import { click } from '@/fx/sound'

export function LacquerPicker() {
  const [active, setActive] = useState(LACQUERS[0].id)

  useEffect(() => setActive(savedLacquer().id), [])

  const pick = (i: number, e?: MouseEvent<HTMLButtonElement>) => {
    const l = LACQUERS[i]
    const r = e?.currentTarget.getBoundingClientRect()
    setActive(l.id)
    click()
    applyLacquer(l, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = LACQUERS.findIndex((l) => l.id === active)
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (i + d + LACQUERS.length) % LACQUERS.length
    pick(next)
    ;(e.currentTarget.querySelectorAll('button')[next] as HTMLButtonElement).focus()
  }

  const current = LACQUERS.find((l) => l.id === active)!

  return (
    <div className="lacquer-picker">
      <span className="lacquer-picker__label" id="lacquer-label">
        Лак для сайта: <b>{current.name}</b>
      </span>
      <div role="radiogroup" aria-labelledby="lacquer-label" className="lacquer-picker__caps" onKeyDown={onKey}>
        {LACQUERS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={l.id === active}
            aria-label={l.name}
            tabIndex={l.id === active ? 0 : -1}
            className="lacquer-cap"
            style={{ '--cap': l.hex } as React.CSSProperties}
            onClick={(e) => pick(i, e)}
          />
        ))}
      </div>
    </div>
  )
}
