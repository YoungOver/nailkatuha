import type { Rgb } from './sim'

export type SplatEvent = { x: number; y: number; dx: number; dy: number; color?: Rgb }

type Listener = (e: SplatEvent) => void

const listeners = new Set<Listener>()

/** Lets other effects (the nail-file cursor) stir the smoke without owning the simulation. */
export const smokeBus = {
  emit(e: SplatEvent) {
    for (const l of listeners) l(e)
  },
  on(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

/* Lime appears once in five: mixed with pink it turns olive, so it stays an accent. */
export const NEON: Rgb[] = [
  [1, 0.31, 0.55],
  [0.18, 0.95, 0.9],
  [0.48, 0.36, 1],
  [1, 0.31, 0.55],
  [0.84, 1, 0.23],
]
