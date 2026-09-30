import { describe, expect, it } from 'vitest'
import { NAIL_SHAPES } from './nailShape'

describe('nail shapes', () => {
  it('gets taller as the nail gets longer', () => {
    const ratios = (['short', 'medium', 'long', 'extreme'] as const).map((l) => NAIL_SHAPES[l].ratio)
    for (let i = 1; i < ratios.length; i++) expect(ratios[i]).toBeGreaterThan(ratios[i - 1])
  })

  it('keeps every path inside the unit box and closed', () => {
    for (const { path } of Object.values(NAIL_SHAPES)) {
      expect(path.trim().endsWith('Z')).toBe(true)
      for (const n of path.match(/-?\d*\.?\d+/g)!.map(Number)) {
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(1)
      }
    }
  })
})
