import { smokeBus } from './fluid/bus'

export type Lacquer = { id: string; name: string; hex: string }

/* Shades taken from the master's own moodboards: cherries, chocolate, plums, sakura, chrome. */
export const LACQUERS: Lacquer[] = [
  { id: 'malina', name: 'Малина', hex: '#ff4f8b' },
  { id: 'cherry', name: 'Вишня', hex: '#c8102e' },
  { id: 'chocolate', name: 'Шоколад', hex: '#7b4a2e' },
  { id: 'lavender', name: 'Лаванда', hex: '#9c8cff' },
  { id: 'nude', name: 'Нюд', hex: '#e8b9a6' },
  { id: 'chrome', name: 'Хром', hex: '#c9d1da' },
  { id: 'sky', name: 'Небо', hex: '#6ec8ff' },
  { id: 'lime', name: 'Лайм', hex: '#d7ff3a' },
]

const INK = '#1a0710'
const MILK = '#f3ede7'
const KEY = 'nailkatuha:lacquer'

function channel(v: number) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function textOn(hex: string) {
  return contrast(hex, INK) >= contrast(hex, MILK) ? INK : MILK
}

export function rgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function paint(l: Lacquer) {
  const root = document.documentElement
  root.style.setProperty('--lacquer', l.hex)
  root.style.setProperty('--on-lacquer', textOn(l.hex))
  root.dataset.lacquer = l.id
}

export function savedLacquer(): Lacquer {
  try {
    const id = localStorage.getItem(KEY)
    return LACQUERS.find((l) => l.id === id) ?? LACQUERS[0]
  } catch {
    return LACQUERS[0]
  }
}

/** Repaints the site in a new lacquer; the change spreads from the click like a drop of polish. */
export function applyLacquer(l: Lacquer, origin?: { x: number; y: number }) {
  try {
    localStorage.setItem(KEY, l.id)
  } catch {}

  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || !origin || reduced) {
    paint(l)
  } else {
    const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
    doc.startViewTransition(() => paint(l)).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

  const [cr, cg, cb] = rgb01(l.hex)
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2
    smokeBus.emit({ x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, dx: Math.cos(a) * 40, dy: Math.sin(a) * 40, color: [cr, cg, cb] })
  }
}

export function restoreLacquer() {
  paint(savedLacquer())
}
