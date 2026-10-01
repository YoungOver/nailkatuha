import { accentFor, contrast, normalizeHex } from './color'
import { applyCursor } from './cursor'

export { contrast } from './color'

export type Lacquer = { id: string; name: string; hex: string }
export type Finish = 'gloss' | 'matte' | 'chrome' | 'cateye' | 'shimmer' | 'pearl' | 'velvet' | 'french' | 'ombre'
export type Shape = 'square' | 'squoval' | 'oval' | 'almond' | 'coffin' | 'lipstick' | 'stiletto'
export type Length = 'short' | 'medium' | 'long'

/* Shades from the master's own moodboards: berries, chocolate and latte, nudes, plums, sage, chrome. */
export const LACQUERS: Lacquer[] = [
  { id: 'malina', name: 'Малина', hex: '#ff4f8b' },
  { id: 'cherry', name: 'Вишня', hex: '#c8102e' },
  { id: 'bordo', name: 'Бордо', hex: '#6d0f24' },
  { id: 'plum', name: 'Слива', hex: '#5b2a5e' },
  { id: 'chocolate', name: 'Шоколад', hex: '#7b4a2e' },
  { id: 'latte', name: 'Латте', hex: '#c49a7a' },
  { id: 'nude', name: 'Нюд', hex: '#e8b9a6' },
  { id: 'powder', name: 'Пудра', hex: '#d9a3b0' },
  { id: 'milk', name: 'Молочный', hex: '#f2ece4' },
  { id: 'peach', name: 'Персик', hex: '#ff9e7a' },
  { id: 'lavender', name: 'Лаванда', hex: '#9c8cff' },
  { id: 'sky', name: 'Небо', hex: '#6ec8ff' },
  { id: 'sage', name: 'Шалфей', hex: '#8fae8b' },
  { id: 'lime', name: 'Лайм', hex: '#d7ff3a' },
  { id: 'chrome', name: 'Хром', hex: '#c9d1da' },
  { id: 'black', name: 'Чёрный', hex: '#141216' },
]

export const FINISHES: { id: Finish; name: string }[] = [
  { id: 'gloss', name: 'Глянец' },
  { id: 'matte', name: 'Матовый' },
  { id: 'chrome', name: 'Хром' },
  { id: 'cateye', name: 'Кошачий глаз' },
  { id: 'shimmer', name: 'Шиммер' },
  { id: 'pearl', name: 'Перламутр' },
  { id: 'velvet', name: 'Бархат' },
  { id: 'french', name: 'Френч' },
  { id: 'ombre', name: 'Омбре' },
]

export const SHAPES: { id: Shape; name: string }[] = [
  { id: 'square', name: 'Квадрат' },
  { id: 'squoval', name: 'Мягкий квадрат' },
  { id: 'oval', name: 'Овал' },
  { id: 'almond', name: 'Миндаль' },
  { id: 'coffin', name: 'Балерина' },
  { id: 'lipstick', name: 'Помада' },
  { id: 'stiletto', name: 'Стилет' },
]

export const LENGTHS: { id: Length; name: string }[] = [
  { id: 'short', name: 'Короткие' },
  { id: 'medium', name: 'Средние' },
  { id: 'long', name: 'Длинные' },
]

const INK = '#1a0710'
const MILK = '#f3ede7'
const KEY = 'nailkatuha:lacquer'
const CUSTOM_KEY = 'nailkatuha:custom'
const FINISH_KEY = 'nailkatuha:finish'
const SHAPE_KEY = 'nailkatuha:shape'
const LENGTH_KEY = 'nailkatuha:length'
/* what the boot script in the page head reads, so the accent is right before the first paint */
export const PAINT_KEY = 'nailkatuha:paint'

export function textOn(hex: string) {
  return contrast(hex, INK) >= contrast(hex, MILK) ? INK : MILK
}

/** Colours for the page: an accent readable on the dark background, and text that reads on the accent. */
export function paintFor(hex: string) {
  /* a mid-tone can be readable on the page and still too dull for any text on a button made of it */
  const accent = accentFor(hex, undefined, undefined, (c) => contrast(c, textOn(c)) >= 4.5)
  return { accent, on: textOn(accent) }
}

export function customLacquer(hex: string): Lacquer {
  return { id: 'custom', name: 'Свой цвет', hex: normalizeHex(hex) ?? LACQUERS[0].hex }
}

export type LacquerState = { lacquer: Lacquer; finish: Finish; shape: Shape; length: Length }
type Listener = (s: LacquerState) => void

let state: LacquerState = { lacquer: LACQUERS[0], finish: 'gloss', shape: 'almond', length: 'medium' }
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

function emit() {
  for (const l of listeners) l(state)
}

/** Shared lacquer state: the picker writes it, the page colours, the 3D tips and the try-on read it. */
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
      lacquer: read(KEY, (id) => (id === 'custom' ? customLacquer(read(CUSTOM_KEY, (h) => h ?? '')) : (LACQUERS.find((l) => l.id === id) ?? LACQUERS[0]))),
      finish: read(FINISH_KEY, (f) => (FINISHES.some((x) => x.id === f) ? (f as Finish) : 'gloss')),
      shape: read(SHAPE_KEY, (v) => (SHAPES.some((x) => x.id === v) ? (v as Shape) : 'almond')),
      length: read(LENGTH_KEY, (v) => (LENGTHS.some((x) => x.id === v) ? (v as Length) : 'medium')),
    }
    paint(state.lacquer)
    emit()
    return state
  },
  setLacquer(lacquer: Lacquer, origin?: { x: number; y: number }) {
    write(KEY, lacquer.id)
    if (lacquer.id === 'custom') write(CUSTOM_KEY, lacquer.hex)
    state = { ...state, lacquer }
    repaint(lacquer, origin)
    emit()
  },
  /** A colour from the wheel: while it is dragged the page repaints at once, without the drop animation. */
  setColor(hex: string) {
    lacquerStore.setLacquer(customLacquer(hex))
  },
  setFinish(finish: Finish) {
    write(FINISH_KEY, finish)
    state = { ...state, finish }
    emit()
  },
  setShape(shape: Shape) {
    write(SHAPE_KEY, shape)
    state = { ...state, shape }
    emit()
  },
  setLength(length: Length) {
    write(LENGTH_KEY, length)
    state = { ...state, length }
    emit()
  },
}

function paint(l: Lacquer) {
  const root = document.documentElement
  const { accent, on } = paintFor(l.hex)
  root.style.setProperty('--lacquer', accent)
  root.style.setProperty('--on-lacquer', on)
  root.style.setProperty('--lacquer-true', l.hex)
  root.dataset.lacquer = l.id
  write(PAINT_KEY, JSON.stringify([accent, on]))
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) applyCursor(accent)
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
