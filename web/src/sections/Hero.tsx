import type { CSSProperties } from 'react'
import { LacquerButton } from '@/components/LacquerButton'
import { LacquerPicker } from '@/components/LacquerPicker'
import { studio } from '@/content/studio'
import { Showcase } from '@/fx/nails/Showcase'

export function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero__inner wrap">
        <div className="hero__copy">
          {/* whole words rise out of their line in CSS, from the very first paint, so nothing flashes after load */}
          <h1 className="hero__title">
            {studio.heroWords.map((word, i) => (
              <span key={word} className="hero__word" style={{ '--i': i } as CSSProperties}>
                <span className="hero__word-text">
                  {word}
                  <span className="hero__dot">.</span>
                </span>
              </span>
            ))}
          </h1>
          <p className="hero__lead">{studio.heroLead}</p>
          <div className="hero__actions">
            <LacquerButton href="#booking">Записаться на окошко</LacquerButton>
            <a className="ghost-btn" href="#tryon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
              Примерить на свои руки
            </a>
          </div>
        </div>

        <div className="hero__stage">
          <Showcase />
          <LacquerPicker />
        </div>
      </div>
      <a className="hero__scroll" href="#layers">
        Листайте
      </a>
    </section>
  )
}
