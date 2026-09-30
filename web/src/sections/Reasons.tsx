'use client'

import { useState } from 'react'
import { studio } from '@/content/studio'
import { LACQUERS } from '@/fx/lacquer'
import { click } from '@/fx/sound'

/*
 * A swatch fan: the ring of nail tips masters use to show polish colours.
 * Five tips on one rivet, one reason per tip; the chosen tip slides out of the fan.
 */
const ANGLES = [-44, -22, 0, 22, 44]
const SWATCHES = ['malina', 'cherry', 'lavender', 'nude', 'chrome'].map((id) => LACQUERS.find((l) => l.id === id)!.hex)
const W = 50
const L = 200
const TIP = `M${-W / 2} -46 C${-W / 2} ${-L * 0.78} ${-W * 0.3} ${-L} 0 ${-L} C${W * 0.3} ${-L} ${W / 2} ${-L * 0.78} ${W / 2} -46 Q${W / 2} -6 0 -6 Q${-W / 2} -6 ${-W / 2} -46 Z`

export function Reasons() {
  const [active, setActive] = useState(0)
  const choose = (i: number) => {
    if (i !== active) click()
    setActive(i)
  }

  return (
    <section id="reasons" className="section reasons" aria-labelledby="reasons-title">
      <div className="safe-x reasons__grid">
        <div className="reasons__fan">
          <svg viewBox="-210 -250 420 290" role="img" aria-label="Веер типс с пятью оттенками, на каждой типсе одна причина">
            {ANGLES.map((a, i) => (
              <g key={a} transform={`rotate(${a} 0 -24)`} className="tip" data-active={active === i || undefined} onPointerEnter={() => choose(i)} onClick={() => choose(i)}>
                <g className="tip__slide">
                  <path d={TIP} fill={SWATCHES[i]} className="tip__body" />
                  <path d={`M${-W * 0.18} ${-L * 0.9} C${-W * 0.3} ${-L * 0.7} ${-W * 0.3} ${-L * 0.45} ${-W * 0.22} ${-L * 0.3}`} className="tip__gloss" />
                  <circle cx="0" cy="-24" r="6" className="tip__hole" />
                </g>
              </g>
            ))}
            <circle cx="0" cy="-24" r="9" className="fan__rivet" />
          </svg>
        </div>

        <div className="reasons__text">
          <h2 id="reasons-title" className="section__title font-display">
            Пять причин прийти
          </h2>
          <ul className="reasons__list">
            {studio.reasons.map((r, i) => (
              <li key={r}>
                <button
                  type="button"
                  className="reasons__item"
                  aria-pressed={active === i}
                  style={{ '--swatch': SWATCHES[i] } as React.CSSProperties}
                  onPointerEnter={() => choose(i)}
                  onFocus={() => choose(i)}
                  onClick={() => choose(i)}
                >
                  {r}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
