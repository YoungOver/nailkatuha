'use client'

import { useEffect, useRef, useState } from 'react'
import { layerStep } from '@/fx/nails/steps'
import { useScene } from '@/fx/nails/useScene'

const STEPS = [
  { title: 'Подготовка', text: 'Форма, кутикула и чистая ногтевая пластина. На неподготовленном ногте покрытие не держится.' },
  { title: 'База', text: 'Выравнивает пластину и держит цвет. Наносится тонко и сохнет в LED-лампе.' },
  { title: 'Цвет', text: 'Два тонких слоя выбранного оттенка: так цвет ровный и не скалывается по краю.' },
  { title: 'Топ', text: 'Запечатывает края и даёт глянец, мат или хром. Покрытие держится 3–4 недели.' },
]

/*
 * The product-page moment: the section is several screens tall, its stage is
 * pinned, and the scroll takes one nail apart layer by layer. Scroll position
 * becomes progress 0..1 for the 3D scene and the active step for the text.
 */
export function Layers() {
  const section = useRef<HTMLElement>(null)
  const { canvasRef, ready, progress } = useScene('layers')
  const [step, setStep] = useState(0)

  useEffect(() => {
    const el = section.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))
      progress.current(p)
      el.style.setProperty('--p', p.toFixed(4))
      setStep(layerStep(p))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [progress, ready])

  return (
    <section ref={section} id="layers" className="layers" aria-labelledby="layers-title">
      <div className="layers__stage">
        <div className="layers__canvas" data-ready={ready || undefined} aria-hidden="true">
          <div className="layers__glow" />
          <canvas ref={canvasRef} />
        </div>
        <div className="layers__copy wrap">
          <p className="eyebrow">Из чего сделан маникюр</p>
          <h2 id="layers-title" className="section-title">
            Четыре слоя.
            <br />
            Ни одного лишнего.
          </h2>
          <ol className="layers__steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="layers__step" data-active={i === step || undefined} data-done={i < step || undefined}>
                <span className="layers__num">{i + 1}</span>
                <span className="layers__text">
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="layers__bar" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </section>
  )
}
