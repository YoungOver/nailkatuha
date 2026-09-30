import { describe, expect, it } from 'vitest'
import { contrast, LACQUERS, textOn } from './lacquer'

describe('lacquer palette', () => {
  it('has eight named shades with a default', () => {
    expect(LACQUERS).toHaveLength(8)
    expect(LACQUERS[0].id).toBe('malina')
    expect(new Set(LACQUERS.map((l) => l.id)).size).toBe(8)
  })

  it('keeps button text readable on every lacquer', () => {
    for (const l of LACQUERS) {
      expect(contrast(l.hex, textOn(l.hex)), l.name).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})
