import { applyCursor } from './cursor'

export type Lacquer = { id: string; name: string; hex: string }
export type Finish = 'gloss' | 'matte' | 'chrome' | 'cateye'
export type Shape = 'almond' | 'square' | 'stiletto' | 'coffin'

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

export const FINISHES: { id: Finish; name: string }[] = [
  { id: 'gloss', name: 'Глянец' },
  { id: 'cateye', name: 'Кошачий глаз' },
  { id: 'chrome', name: 'Хром' },
  { id: 'matte', name: 'Матовый' },
]

export const SHAPES: { id: Shape; name: string }[] = [
  { id: 'almond', name: 'Миндаль' },
  { id: 'square', name: 'Квадрат' },
  { id: 'coffin', name: 'Балерина' },
  { id: 'stiletto', name: 'Стилет' },
]

const INK = '#1a0710'
const MILK = '#f3ede7'
const KEY = 'nailkatuha:lacquer'
const FINISH_KEY = 'nailkatuha:finish'
const SHAPE_KEY = 'nailkatuha:shape'

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

type State = { lacquer: Lacquer; finish: Finish; shape: Shape }
type Listener = (s: State) => void

let state: State = { lacquer: LACQUERS[0], finish: 'gloss', shape: 'almond' }
const listeners = new Set<Listener>()

function read<T>(key: string, parse: (v: string | null) => T): T {
  try {
    return parse(localStorage.getItem(key))
  } catch {
    return parse(null)
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

/** Shared lacquer state: the swatches write it, the page colours and the 3D tips read it. */
export const lacquerStore = {
  get: () => state,
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  restore() {
    state = {
      lacquer: read(KEY, (id) => LACQUERS.find((l) => l.id === id) ?? LACQUERS[0]),
      finish: read(FINISH_KEY, (f) => (FINISHES.some((x) => x.id === f) ? (f as Finish) : 'gloss')),
      shape: read(SHAPE_KEY, (v) => (SHAPES.some((x) => x.id === v) ? (v as Shape) : 'almond')),
    }
    paint(state.lacquer)
    for (const l of listeners) l(state)
    return state
  },
  setLacquer(lacquer: Lacquer, origin?: { x: number; y: number }) {
    write(KEY, lacquer.id)
    state = { ...state, lacquer }
    repaint(lacquer, origin)
    for (const l of listeners) l(state)
  },
  setFinish(finish: Finish) {
    write(FINISH_KEY, finish)
    state = { ...state, finish }
    for (const l of listeners) l(state)
  },
  setShape(shape: Shape) {
    write(SHAPE_KEY, shape)
    state = { ...state, shape }
    for (const l of listeners) l(state)
  },
}

function paint(l: Lacquer) {
  const root = document.documentElement
  root.style.setProperty('--lacquer', l.hex)
  root.style.setProperty('--on-lacquer', textOn(l.hex))
  root.dataset.lacquer = l.id
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) applyCursor(l.hex)
}

/** The page accent changes with a spreading circle from the click, like a drop of polish. */
function repaint(l: Lacquer, origin?: { x: number; y: number }) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || !origin || reduced) {
    paint(l)
    return
  }
  const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
  doc.startViewTransition(() => paint(l)).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
      { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
    )
  })
}
