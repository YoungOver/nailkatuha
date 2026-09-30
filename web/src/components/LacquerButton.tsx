'use client'

import { useRef, type ComponentPropsWithoutRef, type PointerEvent } from 'react'

type Props = ComponentPropsWithoutRef<'a'> & { tone?: 'lacquer' | 'glass' }

export function LacquerButton({ tone = 'lacquer', className = '', children, ...rest }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)

  const track = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <a ref={ref} onPointerMove={track} data-tone={tone} className={`lacquer-btn ${className}`} {...rest}>
      <span className="lacquer-btn__label">{children}</span>
    </a>
  )
}
