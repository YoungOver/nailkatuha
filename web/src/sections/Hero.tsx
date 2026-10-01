import type { CSSProperties } from 'react'
import { LacquerButton } from '@/components/LacquerButton'
import { LacquerPicker } from '@/components/LacquerPicker'
import { studio } from '@/content/studio'
import { Showcase } from '@/fx/nails/Showcase'

const wordTones = ['tone-pink', 'tone-amber', 'tone-violet', 'tone-rose']

export function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero__grid safe-x">
        <div className="hero__copy">
          {/* whole words rise out of their line in CSS, from the very first paint, so kerning stays intact and nothing flashes */}
          <h1 className="hero__title font-display">
            {studio.heroWords.map((word, i) => (
              <span key={word} className={`hero__word ${wordTones[i]}`} style={{ '--i': i } as CSSProperties}>
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
          </div>
        </div>

        <div className="hero__stage">
          <Showcase />
          <LacquerPicker />
        </div>

        <p className="hero__place">
          {studio.city}, {studio.address}, метро {studio.metro.name}
        </p>
      </div>
    </section>
  )
}
