import type { ComponentPropsWithoutRef } from 'react'

type Props = ComponentPropsWithoutRef<'a'> & { tone?: 'lacquer' | 'glass' }

export function LacquerButton({ tone = 'lacquer', className = '', children, ...rest }: Props) {
  return (
    <a data-tone={tone} className={`lacquer-btn ${className}`} {...rest}>
      <span className="lacquer-btn__label">{children}</span>
    </a>
  )
}
