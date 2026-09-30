'use client'

import { useState } from 'react'
import { WorkImage } from '@/components/WorkImage'
import { NAIL_SHAPES } from '@/content/nailShape'
import { studio } from '@/content/studio'
import { works } from '@/content/works'
import { click } from '@/fx/sound'

/* Every reason is backed by one of the master's own works. */
const PROOF = [12, 2, 4, 10, 5].map((id) => works.find((w) => w.id === id)!)

export function Reasons() {
  const [active, setActive] = useState(0)
  const choose = (i: number) => {
    if (i !== active) click()
    setActive(i)
  }

  return (
    <section id="reasons" className="section reasons" aria-labelledby="reasons-title">
      <div className="safe-x reasons__grid">
        <div className="reasons__text">
          <h2 id="reasons-title" className="section__title font-display">
            Пять причин прийти
          </h2>
          <ol className="reasons__list">
            {studio.reasons.map((r, i) => (
              <li key={r}>
                <button
                  type="button"
                  className="reasons__item"
                  aria-pressed={active === i}
                  onPointerEnter={() => choose(i)}
                  onFocus={() => choose(i)}
                  onClick={() => choose(i)}
                >
                  <span className="reasons__thumb" style={{ clipPath: `url(#nail-${PROOF[i].length})` }}>
                    <WorkImage work={PROOF[i]} sizes="4rem" />
                  </span>
                  <span className="reasons__num font-display">{i + 1}</span>
                  <span className="reasons__line font-display">{r}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <figure className="reasons__proof" aria-live="polite">
          <div className="reasons__frame" style={{ aspectRatio: `1 / ${NAIL_SHAPES.long.ratio}`, clipPath: 'url(#nail-long)' }}>
            {PROOF.map((w, i) => (
              <div key={w.id} className="reasons__photo" data-active={active === i || undefined}>
                <WorkImage work={w} sizes="(min-width: 900px) 28vw, 0px" />
              </div>
            ))}
          </div>
          <figcaption className="reasons__caption">{PROOF[active].alt}</figcaption>
        </figure>
      </div>
    </section>
  )
}
