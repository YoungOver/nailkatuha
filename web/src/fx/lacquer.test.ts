import { describe, expect, it } from 'vitest'
import { contrast, PAGE } from './color'
import { customLacquer, FINISHES, LACQUERS, LENGTHS, paintFor, SHAPES } from './lacquer'

describe('lacquer palette', () => {
  it('has sixteen named shades from the master’s moodboards, raspberry first', () => {
    expect(LACQUERS).toHaveLength(16)
    expect(LACQUERS[0].id).toBe('malina')
    expect(new Set(LACQUERS.map((l) => l.id)).size).toBe(16)
    expect(new Set(LACQUERS.map((l) => l.hex)).size).toBe(16)
  })

  it('offers nine finishes, seven shapes and three lengths', () => {
    expect(FINISHES).toHaveLength(9)
    expect(SHAPES).toHaveLength(7)
    expect(LENGTHS).toHaveLength(3)
  })

  it('keeps the page readable and button text legible on every shade, the custom ones too', () => {
    for (const hex of [...LACQUERS.map((l) => l.hex), '#000000', '#141216', '#ffffff', '#ffff00']) {
      const { accent, on } = paintFor(hex)
      expect(contrast(accent, PAGE), hex).toBeGreaterThanOrEqual(4.5)
      expect(contrast(accent, on), hex).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('names a custom colour by its hex', () => {
    expect(customLacquer('#12AB34')).toEqual({ id: 'custom', name: 'Свой цвет', hex: '#12ab34' })
  })
})
