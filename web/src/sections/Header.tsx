'use client'

import { useEffect, useRef, useState } from 'react'
import { LacquerButton } from '@/components/LacquerButton'
import { SoundToggle } from '@/components/SoundToggle'

const base = process.env.NEXT_PUBLIC_BASE ?? ''

const links = [
  { href: `${base}/#works`, label: 'Работы' },
  { href: `${base}/portfolio/`, label: 'Портфолио' },
  { href: `${base}/#prices`, label: 'Цены' },
  { href: `${base}/#contacts`, label: 'Контакты' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    document.documentElement.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className="site-header" data-scrolled={scrolled || undefined} data-open={open || undefined}>
      <div className="site-header__bar safe-x">
        <a href={`${base}/`} className="site-header__logo font-display" aria-label="nailkatuha, на главную">
          nail<span>katuha</span>
        </a>

        <nav aria-label="Разделы" className="site-header__nav">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <SoundToggle />

        <LacquerButton href={`${base}/#booking`} className="site-header__cta">
          Записаться
        </LacquerButton>

        <button
          ref={toggle}
          type="button"
          className="site-header__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Закрыть' : 'Меню'}
        </button>
      </div>

      <div id="mobile-menu" className="site-header__sheet safe-x" hidden={!open}>
        <nav aria-label="Разделы" className="font-display">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={close}>
              {l.label}
            </a>
          ))}
        </nav>
        <LacquerButton href={`${base}/#booking`} onClick={close}>
          Записаться
        </LacquerButton>
      </div>
    </header>
  )
}
