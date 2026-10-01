import { describe, expect, it } from 'vitest'
import { accentFor, contrast, hexToHsv, hsvToHex, normalizeHex } from './color'

describe('colour math', () => {
  it('goes from hex to hue, saturation, value and back', () => {
    for (const hex of ['#ff4f8b', '#c8102e', '#7b4a2e', '#9c8cff', '#e8b9a6', '#141216', '#ffffff', '#000000']) {
      const { h, s, v } = hexToHsv(hex)
      expect(hsvToHex(h, s, v)).toBe(hex)
    }
  })

  it('places pure hues on the wheel', () => {
    expect(hexToHsv('#ff0000').h).toBeCloseTo(0, 5)
    expect(hexToHsv('#00ff00').h).toBeCloseTo(120, 5)
    expect(hexToHsv('#0000ff').h).toBeCloseTo(240, 5)
  })

  it('reads hex the way people type it', () => {
    expect(normalizeHex('FF4F8B')).toBe('#ff4f8b')
    expect(normalizeHex('#abc')).toBe('#aabbcc')
    expect(normalizeHex('12345')).toBeNull()
    expect(normalizeHex('#gg0000')).toBeNull()
  })

  it('lifts a shade that would vanish on the dark page until text in it is readable', () => {
    const page = '#000000'
    for (const hex of ['#141216', '#000000', '#5b2a5e', '#6d0f24', '#ff4f8b']) {
      expect(contrast(accentFor(hex), page), hex).toBeGreaterThanOrEqual(4.5)
    }
    expect(accentFor('#ff4f8b')).toBe('#ff4f8b')
  })
})
