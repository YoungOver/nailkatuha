'use client'

import { useEffect, useRef, useState } from 'react'
import { hexToHsv, hsvToHex, normalizeHex } from '@/fx/color'

type Hsv = { h: number; s: number; v: number }

/*
 * Any colour, not only the master's sixteen: hue runs round the disc, saturation
 * grows from the white centre to the rim, brightness has its own slider. Dragging
 * repaints the nails live. Under the disc sit ordinary range inputs for hue and
 * saturation, so the keyboard and screen readers get the same control.
 */
export function ColorWheel({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const disc = useRef<HTMLDivElement>(null)
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [draft, setDraft] = useState(value)
  const own = useRef(value)

  /* a swatch picked elsewhere moves the thumb; our own changes do not echo back and jitter */
  useEffect(() => {
    if (value === own.current) return
    own.current = value
    setHsv(hexToHsv(value))
    setDraft(value)
  }, [value])

  const commit = (next: Hsv) => {
    setHsv(next)
    const hex = hsvToHex(next.h, next.s, next.v)
    own.current = hex
    setDraft(hex)
    onChange(hex)
  }

  const fromPointer = (e: React.PointerEvent) => {
    const r = disc.current!.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    const s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2))
    commit({ ...hsv, h, s, v: hsv.v < 0.2 ? 0.85 : hsv.v })
  }

  const rad = (hsv.h * Math.PI) / 180
  const thumb = { left: `${50 + Math.sin(rad) * hsv.s * 50}%`, top: `${50 - Math.cos(rad) * hsv.s * 50}%` }
  const hex = hsvToHex(hsv.h, hsv.s, hsv.v)

  return (
    <div className="wheel" style={{ '--wheel-v': hsv.v, '--wheel-hex': hex, '--wheel-pure': hsvToHex(hsv.h, hsv.s, 1) } as React.CSSProperties}>
      <div
        ref={disc}
        className="wheel__disc"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
        aria-hidden="true"
      >
        <span className="wheel__thumb" style={thumb} />
      </div>

      <div className="wheel__controls">
        <label className="wheel__range wheel__range--hidden">
          <span>Оттенок</span>
          <input type="range" min={0} max={359} value={Math.round(hsv.h)} onChange={(e) => commit({ ...hsv, h: Number(e.target.value) })} />
        </label>
        <label className="wheel__range wheel__range--hidden">
          <span>Насыщенность</span>
          <input type="range" min={0} max={100} value={Math.round(hsv.s * 100)} onChange={(e) => commit({ ...hsv, s: Number(e.target.value) / 100 })} />
        </label>
        <label className="wheel__range">
          <span>Яркость</span>
          <input type="range" min={5} max={100} value={Math.round(hsv.v * 100)} onChange={(e) => commit({ ...hsv, v: Number(e.target.value) / 100 })} />
        </label>
        <label className="wheel__hex">
          <span>Код цвета</span>
          <input
            value={draft}
            spellCheck={false}
            maxLength={7}
            onChange={(e) => {
              setDraft(e.target.value)
              const ok = normalizeHex(e.target.value)
              if (ok && e.target.value.replace('#', '').length === 6) commit(hexToHsv(ok))
            }}
            onBlur={() => setDraft(hex)}
          />
        </label>
      </div>
    </div>
  )
}
