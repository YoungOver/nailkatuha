'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { lengthLabel, styleLabel, type Work } from '@/content/works'
import { click } from '@/fx/sound'
import { WorkImage } from './WorkImage'

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

const NAME = 'work-photo'
const MAX = 5

function withTransition(update: () => void, from?: HTMLElement | null) {
  const doc = document as Doc
  if (!doc.startViewTransition) {
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

/*
 * Zoom and pan for the photo: wheel or trackpad, double click or double tap,
 * two-finger pinch, drag to move. Transforms go straight to the element style,
 * so dragging runs at the display rate without React renders.
 */
function useZoom(
  stage: React.RefObject<HTMLDivElement | null>,
  layer: React.RefObject<HTMLDivElement | null>,
  key: unknown,
  onSwipe: (dx: number, dy: number) => void,
  onBackdrop: () => void,
) {
  const z = useRef({ s: 1, x: 0, y: 0 })
  const [zoomed, setZoomed] = useState(false)

  const apply = useCallback(() => {
    const el = layer.current
    if (!el) return
    const { s } = z.current
    const w = el.offsetWidth
    const h = el.offsetHeight
    const mx = ((s - 1) * w) / 2
    const my = ((s - 1) * h) / 2
    z.current.x = Math.max(-mx, Math.min(mx, z.current.x))
    z.current.y = Math.max(-my, Math.min(my, z.current.y))
    el.style.transform = `translate3d(${z.current.x}px, ${z.current.y}px, 0) scale(${s})`
    setZoomed(s > 1.01)
  }, [layer])

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const el = layer.current
      if (!el) return
      const r = el.parentElement!.getBoundingClientRect()
      const cx = clientX - (r.left + r.width / 2)
      const cy = clientY - (r.top + r.height / 2)
      const { s, x, y } = z.current
      const next = Math.max(1, Math.min(MAX, s * factor))
      const k = next / s
      z.current = { s: next, x: cx - (cx - x) * k, y: cy - (cy - y) * k }
      apply()
    },
    [apply, layer],
  )

  const reset = useCallback(() => {
    z.current = { s: 1, x: 0, y: 0 }
    apply()
  }, [apply])

  useEffect(() => {
    z.current = { s: 1, x: 0, y: 0 }
    const el = layer.current
    if (el) el.style.transform = ''
    setZoomed(false)
  }, [key, layer])

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch = 0
    let start: { x: number; y: number; t: number; backdrop: boolean } | null = null
    let moved = false
    let lastTap = 0

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)))
    }
    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = Math.hypot(a.x - b.x, a.y - b.y)
      } else {
        start = { x: e.clientX, y: e.clientY, t: e.timeStamp, backdrop: e.target === el }
        moved = false
      }
    }
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch)
        pinch = d
        moved = true
      } else if (z.current.s > 1.01) {
        z.current.x += e.clientX - prev.x
        z.current.y += e.clientY - prev.y
        apply()
        moved = true
      } else if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        moved = true
      }
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = 0
      if (pointers.size || !start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const tap = !moved && e.timeStamp - start.t < 300
      const backdrop = start.backdrop
      start = null
      /* pointer capture retargets the click to the stage, so a tap outside the photo is judged by where it started */
      if (tap && backdrop && z.current.s <= 1.01) return onBackdrop()
      if (tap && e.pointerType !== 'mouse') {
        if (e.timeStamp - lastTap < 320) {
          if (z.current.s > 1.01) reset()
          else zoomAt(e.clientX, e.clientY, 2.5)
          lastTap = 0
        } else lastTap = e.timeStamp
        return
      }
      if (z.current.s <= 1.01 && moved) onSwipe(dx, dy)
    }
    const onDouble = (e: MouseEvent) => {
      if (z.current.s > 1.01) reset()
      else zoomAt(e.clientX, e.clientY, 2.5)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('dblclick', onDouble)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('dblclick', onDouble)
    }
    /* the stage only exists while a photo is open, so listeners are re-attached per photo */
  }, [stage, zoomAt, apply, reset, onSwipe, onBackdrop, key])

  const zoomBy = useCallback(
    (factor: number) => {
      const r = stage.current?.getBoundingClientRect()
      if (r) zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor)
    },
    [stage, zoomAt],
  )

  return { zoomed, zoomBy, reset }
}

type Props = { items: Work[]; index: number | null; onClose: () => void; onStep: (d: number) => void }

export function Lightbox({ items, index, onClose, onStep }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const work = index === null ? null : items[index]

  const onSwipe = useCallback(
    (dx: number, dy: number) => {
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1)
      else if (dy > 90) onClose()
    },
    [onStep, onClose],
  )
  const { zoomed, zoomBy, reset } = useZoom(stage, layer, work?.id, onSwipe, onClose)

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
      if (e.key === '+' || e.key === '=') zoomBy(1.5)
      if (e.key === '-') zoomBy(1 / 1.5)
      if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [work, onStep, zoomBy, reset])

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label="Просмотр работы"
      data-zoomed={zoomed || undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {work && (
        <div className="lightbox__body">
          <div ref={stage} className="lightbox__stage">
            <div className="lightbox__photo" style={{ viewTransitionName: NAME }}>
              <div ref={layer} className="lightbox__zoom">
                <WorkImage work={work} sizes="100vw" priority />
              </div>
            </div>
          </div>

          <div className="lightbox__bar">
            <p className="lightbox__caption">
              <span>{work.alt}</span>
              <span className="lightbox__tags">
                {lengthLabel[work.length]}, {work.styles.map((s) => styleLabel[s].toLowerCase()).join(', ')}
              </span>
            </p>
            <div className="lightbox__controls">
              <button type="button" className="icon-btn" onClick={() => zoomBy(1 / 1.5)} aria-label="Уменьшить" disabled={!zoomed}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
              </button>
              <button type="button" className="icon-btn" onClick={() => zoomBy(1.5)} aria-label="Увеличить">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" /></svg>
              </button>
              <span className="lightbox__divider" aria-hidden="true" />
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
        </div>
      )}
    </dialog>
  )
}
