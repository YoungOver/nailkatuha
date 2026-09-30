'use client'

import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import { LacquerButton } from '@/components/LacquerButton'
import { LacquerPicker } from '@/components/LacquerPicker'
import { studio } from '@/content/studio'
import { Showcase } from '@/fx/nails/Showcase'

const wordTones = ['tone-pink', 'tone-amber', 'tone-violet', 'tone-rose']

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const title = titleRef.current
    if (!title) return
    /* whole words rise out of their line, so kerning inside each word stays intact */
    const intro = gsap.from(title.querySelectorAll('.hero__word-text'), {
      yPercent: 105,
      duration: 1.05,
      ease: 'expo.out',
      stagger: 0.09,
      delay: 0.1,
    })
    return () => {
      intro.kill()
    }
  }, [])

  return (
    <section id="top" className="hero">
      <div className="hero__grid safe-x">
        <div className="hero__copy">
          <h1 ref={titleRef} className="hero__title font-display">
            {studio.heroWords.map((word, i) => (
              <span key={word} className={`hero__word ${wordTones[i]}`}>
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
