'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { lengthLabel, styleLabel, type Work } from '@/content/works'
import { click } from '@/fx/sound'
import { WorkImage } from './WorkImage'

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

const NAME = 'work-photo'

function withTransition(update: () => void, from?: HTMLElement | null) {
  const doc = document as Doc
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }
  if (from) from.style.viewTransitionName = NAME
  const t = doc.startViewTransition(() => {
    if (from) from.style.viewTransitionName = ''
    flushSync(update)
  })
  t.finished.finally(() => {
    if (from) from.style.viewTransitionName = ''
  })
}

/** Opens a photo in a native dialog, growing out of its thumbnail. */
export function useLightbox(items: Work[]) {
  const [index, setIndex] = useState<number | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const open = useCallback((i: number, from: HTMLElement) => {
    openerRef.current = from
    click()
    withTransition(() => setIndex(i), from.querySelector('img'))
  }, [])

  const close = useCallback(() => {
    const opener = openerRef.current
    withTransition(() => setIndex(null))
    opener?.focus({ preventScroll: true })
  }, [])

  const step = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)),
    [items.length],
  )

  return { index, open, close, step }
}

type Props = { items: Work[]; index: number | null; onClose: () => void; onStep: (d: number) => void }

export function Lightbox({ items, index, onClose, onStep }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const work = index === null ? null : items[index]

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (work && !dialog.open) dialog.showModal()
    if (!work && dialog.open) dialog.close()
  }, [work])

  useEffect(() => {
    if (!work) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onStep(1)
      if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [work, onStep])

  const down = (e: ReactPointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const up = (e: ReactPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1)
    else if (dy > 90) onClose()
  }

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label="Просмотр работы"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {work && (
        <div className="lightbox__body" onPointerDown={down} onPointerUp={up}>
          <figure className="lightbox__figure">
            <div className="lightbox__photo" style={{ viewTransitionName: NAME }}>
              <WorkImage work={work} sizes="(min-width: 900px) 60vw, 94vw" priority />
            </div>
            <figcaption className="lightbox__caption">
              <span>{work.alt}</span>
              <span className="lightbox__tags">
                {lengthLabel[work.length]}, {work.styles.map((s) => styleLabel[s].toLowerCase()).join(', ')}
              </span>
            </figcaption>
          </figure>

          <div className="lightbox__bar">
            <button type="button" className="icon-btn" onClick={() => onStep(-1)} aria-label="Предыдущая работа">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <span className="lightbox__count" aria-live="polite">
              {index! + 1} из {items.length}
            </span>
            <button type="button" className="icon-btn" onClick={() => onStep(1)} aria-label="Следующая работа">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
            <button type="button" className="icon-btn lightbox__close" onClick={onClose} aria-label="Закрыть">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
