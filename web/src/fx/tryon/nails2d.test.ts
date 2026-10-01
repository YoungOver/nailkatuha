import { describe, expect, it } from 'vitest'
import { FINGERS, nailPoses, shapeReach, type Pt } from './nails2d'

/* a straight hand pointing up: each finger's DIP 40 px below its tip */
function hand(): Pt[] {
  const lm: Pt[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9, z: 0 }))
  FINGERS.forEach((f, i) => {
    const x = 0.3 + i * 0.1
    lm[f.tip] = { x, y: 0.3, z: 0 }
    lm[f.dip] = { x, y: 0.4, z: 0 }
  })
  return lm
}

describe('nails on a hand', () => {
  it('puts one nail on every finger, on the last phalanx, pointing along the finger', () => {
    const poses = nailPoses(hand(), 1000, 400)
    expect(poses).toHaveLength(5)
    for (const p of poses) {
      expect(p.cy).toBeGreaterThan(120)
      expect(p.cy).toBeLessThan(160)
      expect(Math.abs(Math.abs(p.angle) - Math.PI / 2)).toBeLessThan(0.01)
      expect(p.len).toBeGreaterThan(20)
      expect(p.width).toBeLessThan(p.len)
    }
  })

  it('makes the thumb nail the widest', () => {
    const [thumb, ...rest] = nailPoses(hand(), 1000, 400)
    for (const p of rest) expect(thumb.width).toBeGreaterThan(p.width)
  })

  it('reaches further past the fingertip for stiletto than for square', () => {
    expect(shapeReach('stiletto')).toBeGreaterThan(shapeReach('almond'))
    expect(shapeReach('almond')).toBeGreaterThan(shapeReach('square'))
  })
})
