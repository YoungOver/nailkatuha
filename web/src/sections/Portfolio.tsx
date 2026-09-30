'use client'

import { useMemo, useState } from 'react'
import { Lightbox, useLightbox } from '@/components/Lightbox'
import { matchesStyle, WorkFilters, type StyleFilter } from '@/components/WorkFilters'
import { WorkImage } from '@/components/WorkImage'
import { NAIL_SHAPES } from '@/content/nailShape'
import { lengthLabel, works, type Length } from '@/content/works'

const LENGTHS: (Length | 'all')[] = ['all', 'short', 'medium', 'long', 'extreme']

export function Portfolio() {
  const [style, setStyle] = useState<StyleFilter>('all')
  const [length, setLength] = useState<Length | 'all'>('all')
  const items = useMemo(() => works.filter((w) => matchesStyle(w, style) && (length === 'all' || w.length === length)), [style, length])
  const lightbox = useLightbox(items)

  return (
    <section className="section portfolio" aria-labelledby="portfolio-title">
      <div className="safe-x section__head portfolio__head">
        <h1 id="portfolio-title" className="section__title font-display">
          Портфолио
        </h1>
        <p className="section__lead">Все работы мастера. Выберите длину и стиль, чтобы найти похожее на то, что хочется вам.</p>
      </div>

      <div className="safe-x portfolio__filters">
        <div className="chips" role="group" aria-label="Длина">
          {LENGTHS.map((l) => (
            <button key={l} type="button" className="chip" aria-pressed={length === l} onClick={() => setLength(l)}>
              {l === 'all' ? 'Любая длина' : lengthLabel[l]}
              <span className="chip__count">{works.filter((w) => (l === 'all' || w.length === l) && matchesStyle(w, style)).length}</span>
            </button>
          ))}
        </div>
        <WorkFilters works={works.filter((w) => length === 'all' || w.length === length)} value={style} onChange={setStyle} />
      </div>

      {items.length ? (
        <ul className="portfolio__grid safe-x" aria-live="polite">
          {items.map((w, i) => (
            <li key={w.id} className="portfolio__item" style={{ aspectRatio: `1 / ${NAIL_SHAPES[w.length].ratio}` }}>
              <button type="button" className="works__open" onClick={(e) => lightbox.open(i, e.currentTarget)} aria-label={`Открыть: ${w.alt}`}>
                <span className="works__mask" style={{ clipPath: `url(#nail-${w.length})` }}>
                  <WorkImage work={w} sizes="(min-width: 1100px) 24vw, (min-width: 700px) 32vw, 48vw" priority={i < 4} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="safe-x portfolio__empty">
          <p>Такого сочетания пока нет в работах. Мастер сделает его по вашему референсу.</p>
          <button
            type="button"
            className="text-link portfolio__reset"
            onClick={() => {
              setStyle('all')
              setLength('all')
            }}
          >
            Показать все работы
          </button>
        </div>
      )}

      <Lightbox items={items} index={lightbox.index} onClose={lightbox.close} onStep={lightbox.step} />
    </section>
  )
}
