'use client'

import { useMemo, useRef, useState } from 'react'
import { Lightbox, useLightbox } from '@/components/Lightbox'
import { matchesStyle, WorkFilters, type StyleFilter } from '@/components/WorkFilters'
import { WorkImage } from '@/components/WorkImage'
import { NAIL_SHAPES } from '@/content/nailShape'
import { works } from '@/content/works'

const base = process.env.NEXT_PUBLIC_BASE ?? ''

export function Works() {
  const [filter, setFilter] = useState<StyleFilter>('all')
  const items = useMemo(() => works.filter((w) => matchesStyle(w, filter)), [filter])
  const lightbox = useLightbox(items)
  const strip = useRef<HTMLUListElement>(null)

  const scrollBy = (dir: number) => {
    const el = strip.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section id="works" className="section works" aria-labelledby="works-title">
      <div className="safe-x section__head">
        <h2 id="works-title" className="section__title font-display">
          Работы
        </h2>
        <p className="section__lead">
          Форма каждой карточки повторяет длину ногтей на фото: от короткого квадрата до стилетов. Фото с картинками рядом это мудборды:
          клиентка приносит идею, мастер переводит её в дизайн.
        </p>
      </div>

      <div className="safe-x works__controls">
        <WorkFilters works={works} value={filter} onChange={setFilter} />
        <div className="works__arrows">
          <button type="button" className="icon-btn" onClick={() => scrollBy(-1)} aria-label="Прокрутить назад">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="icon-btn" onClick={() => scrollBy(1)} aria-label="Прокрутить вперёд">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <ul ref={strip} className="works__strip safe-x" aria-label="Работы мастера">
        {items.map((w, i) => (
          <li key={w.id} className="works__item" style={{ aspectRatio: `1 / ${NAIL_SHAPES[w.length].ratio}` }}>
            <button type="button" className="works__open" onClick={(e) => lightbox.open(i, e.currentTarget)} aria-label={`Открыть: ${w.alt}`}>
              <span className="works__mask" style={{ clipPath: `url(#nail-${w.length})` }}>
                <WorkImage work={w} sizes="(min-width: 900px) 22vw, 62vw" className="works__img" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="safe-x works__more">
        <a href={`${base}/portfolio/`} className="text-link">
          Все {works.length} работ с фильтрами по длине
        </a>
      </div>

      <Lightbox items={items} index={lightbox.index} onClose={lightbox.close} onStep={lightbox.step} />
    </section>
  )
}
