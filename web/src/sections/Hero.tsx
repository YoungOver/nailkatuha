'use client'

import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useEffect, useRef } from 'react'
import { LacquerButton } from '@/components/LacquerButton'
import { LacquerPicker } from '@/components/LacquerPicker'
import { studio } from '@/content/studio'
import { Smoke } from '@/fx/fluid/Smoke'

const wordTones = ['tone-pink', 'tone-amber', 'tone-violet', 'tone-rose']

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const title = titleRef.current
    if (!title) return
    gsap.registerPlugin(SplitText)

    const split = SplitText.create(title.querySelectorAll('.hero__word-text'), {
      type: 'words,chars',
      wordsClass: 'split-word',
      aria: 'auto',
    })

    /* Each letter is its own box, so the word gradient is re-stitched: every letter
       shows the slice of the gradient that sits under it in the whole word. */
    const stitch = () => {
      for (const word of split.words as HTMLElement[]) {
        const width = word.offsetWidth
        for (const ch of word.children as HTMLCollectionOf<HTMLElement>) {
          ch.style.backgroundSize = `${width}px 100%`
          ch.style.backgroundPosition = `${-ch.offsetLeft}px 0`
        }
      }
    }
    stitch()
    const ro = new ResizeObserver(stitch)
    ro.observe(title)
    const intro = gsap.from(split.chars, {
      yPercent: 110,
      rotate: 6,
      opacity: 0,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.018,
      delay: 0.15,
    })

    /* Letters swell from 200 to 560 weight as the pointer passes, like a nail file polishing them. */
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    let raf = 0
    const pointer = { x: -9999, y: -9999 }
    const polish = () => {
      raf = 0
      for (const ch of split.chars as HTMLElement[]) {
        const r = ch.getBoundingClientRect()
        const d = Math.hypot(r.left + r.width / 2 - pointer.x, r.top + r.height / 2 - pointer.y)
        const k = Math.max(0, 1 - d / 220)
        ch.style.fontVariationSettings = `'wght' ${Math.round(200 + 360 * k * k)}`
      }
    }
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      if (!raf) raf = requestAnimationFrame(polish)
    }
    if (fine) window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      intro.kill()
      split.revert()
    }
  }, [])

  return (
    <section id="top" className="hero">
      <Smoke className="hero__smoke" />

      <div className="hero__grid safe-x">
        <div className="hero__titlebox">
        <h1 ref={titleRef} className="hero__title font-display">
          {studio.heroWords.map((word, i) => (
            <span key={word} className={`hero__word ${wordTones[i]}`}>
              <span className="hero__word-text">{word}</span>
              <span className="hero__dot">.</span>
            </span>
          ))}
        </h1>
        </div>

        <div className="hero__side">
          <p className="hero__lead">{studio.heroLead}</p>
          <p className="hero__master">«{studio.masterLine}»</p>
          <div className="hero__actions">
            <LacquerButton href="#booking">Записаться на окошко</LacquerButton>
            <LacquerButton href="#try-on" tone="glass">
              Примерить на свои руки
            </LacquerButton>
          </div>
          <LacquerPicker />
        </div>

        <p className="hero__place">
          {studio.city}, {studio.address}, метро {studio.metro.name}
        </p>
      </div>
    </section>
  )
}
