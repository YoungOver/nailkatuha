'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { FINISHES, LACQUERS, lacquerStore, LENGTHS, SHAPES, type LacquerState, type Shape } from '@/fx/lacquer'
import { click } from '@/fx/sound'
import { ColorWheel } from './ColorWheel'

const SHAPE_ICON: Record<Shape, string> = {
  square: 'M3 22 V3.5 Q3 1.5 5 1.5 H11 Q13 1.5 13 3.5 V22 Z',
  squoval: 'M3 22 V5.5 Q3 1.5 6.5 1.5 H9.5 Q13 1.5 13 5.5 V22 Z',
  oval: 'M3 22 V9 C3 4 5.5 1.5 8 1.5 C10.5 1.5 13 4 13 9 V22 Z',
  almond: 'M3 22 V11 C3 5 6 1.5 8 1.5 C10 1.5 13 5 13 11 V22 Z',
  coffin: 'M3 22 V12 L5.2 2.2 Q5.4 1.5 6.2 1.5 H9.8 Q10.6 1.5 10.8 2.2 L13 12 V22 Z',
  lipstick: 'M3 22 V8 L11.4 1.7 Q13 0.9 13 2.8 V22 Z',
  stiletto: 'M3 22 V13 C3 8 7 3 8 0.5 C9 3 13 8 13 13 V22 Z',
}

const TABS = [
  { id: 'colour', name: 'Цвет' },
  { id: 'shape', name: 'Форма' },
  { id: 'finish', name: 'Покрытие' },
  { id: 'length', name: 'Длина' },
] as const
type Tab = (typeof TABS)[number]['id']

/* arrow keys move between the options of a group, as in any native radio group */
function roving(count: number, active: number, pick: (i: number) => void) {
  return (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (active + d + count) % count
    pick(next)
    ;(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"],[role="tab"]')[next] as HTMLElement | undefined)?.focus()
  }
}

/**
 * The nail studio: colour (sixteen shades or any colour from the wheel), shape,
 * finish and length, one tab at a time so the panel stays small on a phone.
 */
export function LacquerPicker() {
  const uid = useId()
  const [s, setS] = useState<LacquerState>(() => lacquerStore.get())
  const [tab, setTab] = useState<Tab>('colour')
  const [wheel, setWheel] = useState(false)
  const frame = useRef(0)

  useEffect(() => {
    setS(lacquerStore.restore())
    return lacquerStore.subscribe(setS)
  }, [])

  const custom = s.lacquer.id === 'custom'
  const lacquerIndex = custom ? LACQUERS.length : LACQUERS.findIndex((l) => l.id === s.lacquer.id)
  const at = <T extends { id: string }>(list: T[], id: string) => Math.max(0, list.findIndex((x) => x.id === id))
  const shapeIndex = at(SHAPES, s.shape)
  const finishIndex = at(FINISHES, s.finish)
  const lengthIndex = at(LENGTHS, s.length)
  const tabIndex = at(TABS as unknown as { id: string }[], tab)

  const pickLacquer = (i: number, e?: MouseEvent<HTMLElement>) => {
    click()
    if (i === LACQUERS.length) {
      setWheel(true)
      if (!custom) lacquerStore.setColor(s.lacquer.hex)
      return
    }
    setWheel(false)
    const r = e?.currentTarget.getBoundingClientRect()
    lacquerStore.setLacquer(LACQUERS[i], r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined)
  }
  const pickShape = (i: number) => {
    click()
    lacquerStore.setShape(SHAPES[i].id)
  }
  const pickFinish = (i: number) => {
    click()
    lacquerStore.setFinish(FINISHES[i].id)
  }
  const pickLength = (i: number) => {
    click()
    lacquerStore.setLength(LENGTHS[i].id)
  }
  /* the wheel fires on every pointer move; one repaint per frame is plenty */
  const fromWheel = (hex: string) => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => lacquerStore.setColor(hex))
  }

  const name = (id: string) => `${uid}-${id}`
  const radio = (checked: boolean) => ({ role: 'radio' as const, 'aria-checked': checked, tabIndex: checked ? 0 : -1, type: 'button' as const })

  return (
    <div className="studio">
      <p className="studio__now">
        <b>{s.lacquer.name}</b>
        {custom && <span className="studio__hex">{s.lacquer.hex}</span>}, {FINISHES[finishIndex].name.toLowerCase()}, {SHAPES[shapeIndex].name.toLowerCase()},{' '}
        {LENGTHS[lengthIndex].name.toLowerCase()}
      </p>

      <div role="tablist" aria-label="Настройки маникюра" className="studio__tabs" onKeyDown={roving(TABS.length, tabIndex, (i) => setTab(TABS[i].id))}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={name(`tab-${t.id}`)}
            aria-selected={tab === t.id}
            aria-controls={name(`panel-${t.id}`)}
            tabIndex={tab === t.id ? 0 : -1}
            className="studio__tab"
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={name(`panel-${tab}`)} aria-labelledby={name(`tab-${tab}`)} className="studio__panel" data-tab={tab}>
        {tab === 'colour' && (
          <>
            <div role="radiogroup" aria-label="Цвет" className="studio__caps" onKeyDown={roving(LACQUERS.length + 1, lacquerIndex, (i) => pickLacquer(i))}>
              {LACQUERS.map((l, i) => (
                <button
                  key={l.id}
                  {...radio(i === lacquerIndex)}
                  aria-label={l.name}
                  title={l.name}
                  className="lacquer-cap"
                  style={{ '--cap': l.hex } as React.CSSProperties}
                  onClick={(e) => pickLacquer(i, e)}
                />
              ))}
              <button {...radio(custom)} aria-label="Свой цвет" title="Свой цвет" className="lacquer-cap lacquer-cap--wheel" onClick={(e) => pickLacquer(LACQUERS.length, e)} />
            </div>
            {(wheel || custom) && <ColorWheel value={s.lacquer.hex} onChange={fromWheel} />}
          </>
        )}

        {tab === 'shape' && (
          <div role="radiogroup" aria-label="Форма" className="studio__options studio__options--shapes" onKeyDown={roving(SHAPES.length, shapeIndex, pickShape)}>
            {SHAPES.map((f, i) => (
              <button key={f.id} {...radio(i === shapeIndex)} className="studio__option studio__option--shape" onClick={() => pickShape(i)}>
                <svg viewBox="0 0 16 23" aria-hidden="true">
                  <path d={SHAPE_ICON[f.id]} />
                </svg>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'finish' && (
          <>
            <div role="radiogroup" aria-label="Покрытие" className="studio__options" onKeyDown={roving(FINISHES.length, finishIndex, pickFinish)}>
              {FINISHES.map((f, i) => (
                <button key={f.id} {...radio(i === finishIndex)} className="studio__option" onClick={() => pickFinish(i)}>
                  {f.name}
                </button>
              ))}
            </div>
            {(s.finish === 'cateye' || s.finish === 'velvet') && <p className="studio__hint">Ведите курсором или пальцем: блик идёт за ним, как за магнитом</p>}
            {s.finish === 'french' && <p className="studio__hint">Выбранный цвет уходит на кончик, основа остаётся нюдовой</p>}
          </>
        )}

        {tab === 'length' && (
          <div role="radiogroup" aria-label="Длина" className="studio__options studio__options--segmented" onKeyDown={roving(LENGTHS.length, lengthIndex, pickLength)}>
            {LENGTHS.map((f, i) => (
              <button key={f.id} {...radio(i === lengthIndex)} className="studio__option" onClick={() => pickLength(i)}>
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
