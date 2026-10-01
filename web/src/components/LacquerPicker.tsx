'use client'

import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { FINISHES, LACQUERS, lacquerStore, SHAPES, type Finish, type Shape } from '@/fx/lacquer'
import { click } from '@/fx/sound'

const SHAPE_ICON: Record<Shape, string> = {
  almond: 'M3 22 V11 C3 5 6 1.5 8 1.5 C10 1.5 13 5 13 11 V22 Z',
  square: 'M3 22 V3.5 Q3 1.5 5 1.5 H11 Q13 1.5 13 3.5 V22 Z',
  coffin: 'M3 22 V12 L5.2 2.2 Q5.4 1.5 6.2 1.5 H9.8 Q10.6 1.5 10.8 2.2 L13 12 V22 Z',
  stiletto: 'M3 22 V13 C3 8 7 3 8 0.5 C9 3 13 8 13 13 V22 Z',
}

function useRoving<T>(items: T[], active: number, pick: (i: number) => void) {
  return (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (active + d + items.length) % items.length
    pick(next)
    ;(e.currentTarget.querySelectorAll('button')[next] as HTMLButtonElement).focus()
  }
}

export function LacquerPicker() {
  const labelId = useId()
  const [lacquerId, setLacquerId] = useState(LACQUERS[0].id)
  const [finish, setFinish] = useState<Finish>('gloss')
  const [shape, setShape] = useState<Shape>('almond')

  useEffect(() => {
    const s = lacquerStore.restore()
    setLacquerId(s.lacquer.id)
    setFinish(s.finish)
    setShape(s.shape)
    return lacquerStore.subscribe((st) => {
      setLacquerId(st.lacquer.id)
      setFinish(st.finish)
      setShape(st.shape)
    })
  }, [])

  const lacquerIndex = LACQUERS.findIndex((l) => l.id === lacquerId)
  const finishIndex = FINISHES.findIndex((f) => f.id === finish)
  const shapeIndex = SHAPES.findIndex((f) => f.id === shape)

  const pickLacquer = (i: number, e?: MouseEvent<HTMLButtonElement>) => {
    const r = e?.currentTarget.getBoundingClientRect()
    click()
    lacquerStore.setLacquer(LACQUERS[i], r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined)
  }
  const pickFinish = (i: number) => {
    click()
    lacquerStore.setFinish(FINISHES[i].id)
  }

  const pickShape = (i: number) => {
    click()
    lacquerStore.setShape(SHAPES[i].id)
  }

  const onLacquerKey = useRoving(LACQUERS, lacquerIndex, pickLacquer)
  const onShapeKey = useRoving(SHAPES, shapeIndex, pickShape)
  const onFinishKey = useRoving(FINISHES, finishIndex, pickFinish)

  return (
    <div className="lacquer-picker">
      <p className="lacquer-picker__label" id={labelId}>
        <b>{LACQUERS[lacquerIndex].name}</b>, {FINISHES[finishIndex].name.toLowerCase()}, {SHAPES[shapeIndex].name.toLowerCase()}
        {finish === 'cateye' && <span className="lacquer-picker__hint">Ведите курсором или пальцем: блик идёт за ним, как за магнитом</span>}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="lacquer-picker__caps" onKeyDown={onLacquerKey}>
        {LACQUERS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={i === lacquerIndex}
            aria-label={l.name}
            tabIndex={i === lacquerIndex ? 0 : -1}
            className="lacquer-cap"
            style={{ '--cap': l.hex } as React.CSSProperties}
            onClick={(e) => pickLacquer(i, e)}
          />
        ))}
      </div>
      <div className="lacquer-picker__row">
        <div role="radiogroup" aria-label="Форма" className="shape-switch" onKeyDown={onShapeKey}>
          {SHAPES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={i === shapeIndex}
              aria-label={f.name}
              title={f.name}
              tabIndex={i === shapeIndex ? 0 : -1}
              className="shape-switch__item"
              onClick={() => pickShape(i)}
            >
              <svg viewBox="0 0 16 23" aria-hidden="true">
                <path d={SHAPE_ICON[f.id]} />
              </svg>
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Покрытие" className="finish-switch" onKeyDown={onFinishKey}>
          {FINISHES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={i === finishIndex}
              tabIndex={i === finishIndex ? 0 : -1}
              className="finish-switch__item"
              onClick={() => pickFinish(i)}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
