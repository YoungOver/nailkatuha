'use client'

import { useMemo, useState } from 'react'
import { Lightbox, useLightbox } from '@/components/Lightbox'
import { matchesStyle, WorkFilters, type StyleFilter } from '@/components/WorkFilters'
import { WorkImage } from '@/components/WorkImage'
import { NAIL_SHAPES } from '@/content/nailShape'
import { lengthLabel, works, type Length } from '@/content/works'

const LENGTHS: (Length | 'all')[] = ['all', 'short', 'medium', 'long', 'extreme']

/* One gallery for every work: style and length filters, the card shaped like the nails in the photo, zoom on click. */
export function Works() {
  const [style, setStyle] = useState<StyleFilter>('all')
  const [length, setLength] = useState<Length | 'all'>('all')
  const items = useMemo(() => works.filter((w) => matchesStyle(w, style) && (length === 'all' || w.length === length)), [style, length])
  const lightbox = useLightbox(items)

  return (
    <section id="works" className="works" aria-labelledby="works-title">
      <div className="wrap works__head">
        <p className="eyebrow" data-reveal>
          Работы
        </p>
        <h2 id="works-title" className="section-title" data-reveal>
          Ваша идея.
          <br />
          Её руки.
        </h2>
        <p className="section-lead" data-reveal>
          <b>{works.length} свежих работ мастера.</b> Если рядом с ногтями картинка, это мудборд: с такой идеей пришла клиентка, а на
          ногтях то, что из неё получилось. Нажмите на фото, чтобы рассмотреть ближе.
        </p>
      </div>

      <div className="wrap works__filters">
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
        <ul className="wrap works__grid" aria-live="polite">
          {items.map((w, i) => (
            <li key={w.id} className="works__item" data-reveal="scale">
              <button
                type="button"
                className="works__open"
                style={{ aspectRatio: `1 / ${NAIL_SHAPES[w.length].ratio}` }}
                onClick={(e) => lightbox.open(i, e.currentTarget)}
                aria-label={`Открыть: ${w.alt}`}
              >
                <span className="works__mask" style={{ clipPath: `url(#nail-${w.length})` }}>
                  <WorkImage work={w} sizes="(min-width: 1100px) 24vw, (min-width: 700px) 32vw, 48vw" className="works__img" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="wrap works__empty">
          <p>Такого сочетания пока нет в работах. Мастер сделает его по вашему референсу.</p>
          <button
            type="button"
            className="text-link works__reset"
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
