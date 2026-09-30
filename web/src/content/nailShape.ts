import type { Length } from './works'

/*
 * Photo masks shaped like nails, in objectBoundingBox units (0..1). The free
 * edge is at the top. The shape and the height of the card both follow the
 * length of the nails in the photo, so the gallery itself shows length.
 */
export const NAIL_SHAPES: Record<Length, { ratio: number; path: string }> = {
  short: {
    ratio: 1.2,
    path: 'M0 0.16 C0 0.05 0.12 0 0.5 0 C0.88 0 1 0.05 1 0.16 V0.93 Q1 1 0.93 1 H0.07 Q0 1 0 0.93 Z',
  },
  medium: {
    ratio: 1.34,
    path: 'M0 0.32 C0 0.12 0.24 0 0.5 0 C0.76 0 1 0.12 1 0.32 V0.94 Q1 1 0.94 1 H0.06 Q0 1 0 0.94 Z',
  },
  long: {
    ratio: 1.5,
    path: 'M0 0.42 C0 0.17 0.3 0 0.5 0 C0.7 0 1 0.17 1 0.42 V0.95 Q1 1 0.95 1 H0.05 Q0 1 0 0.95 Z',
  },
  extreme: {
    ratio: 1.68,
    path: 'M0 0.5 C0.03 0.3 0.36 0.07 0.5 0 C0.64 0.07 0.97 0.3 1 0.5 V0.96 Q1 1 0.96 1 H0.04 Q0 1 0 0.96 Z',
  },
}
