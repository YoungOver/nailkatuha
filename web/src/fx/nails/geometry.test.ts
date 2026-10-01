import { describe, expect, it } from 'vitest'
import { buildNailGeometry, nailOutline } from './geometry'

describe('nail geometry', () => {
  it('matches the requested width and length', () => {
    const g = buildNailGeometry({ shape: 'almond', width: 1, length: 1.6 })
    g.computeBoundingBox()
    const b = g.boundingBox!
    expect(b.max.x - b.min.x).toBeCloseTo(1, 1)
    expect(b.max.y - b.min.y).toBeCloseTo(1.6, 1)
  })

  it('is thinner at the cuticle than along the plate', () => {
    const g = buildNailGeometry({ shape: 'almond', width: 1, length: 1.6 })
    const pos = g.getAttribute('position')
    const half = pos.count / 2
    const gapAt = (row: number) => pos.getZ(row * 29 + 14) - pos.getZ(half + row * 29 + 14)
    expect(gapAt(0)).toBeLessThan(gapAt(36) * 0.5)
  })

  it('domes across the width like a real nail (C-curve)', () => {
    const g = buildNailGeometry({ shape: 'square', width: 1, length: 1.2 })
    const pos = g.getAttribute('position')
    let centre = -Infinity
    let edge = -Infinity
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      if (y > 0.3 && y < 0.5) {
        if (Math.abs(x) < 0.05) centre = Math.max(centre, pos.getZ(i))
        if (Math.abs(x) > 0.45) edge = Math.max(edge, pos.getZ(i))
      }
    }
    expect(centre - edge).toBeGreaterThan(0.08)
  })

  it('narrows to a point for stilettos and stays blunt for squares', () => {
    const tipWidth = (shape: 'stiletto' | 'square') => {
      const pts = nailOutline(shape, 1, 1.6)
      const top = pts.filter((p) => p.y > 1.6 * 0.95)
      return Math.max(...top.map((p) => p.x)) - Math.min(...top.map((p) => p.x))
    }
    expect(tipWidth('stiletto')).toBeLessThan(0.15)
    expect(tipWidth('square')).toBeGreaterThan(0.6)
  })
})
