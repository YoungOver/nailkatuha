import { describe, expect, it } from 'vitest'
import { pickQuality, simSize } from './quality'

describe('fluid quality', () => {
  it('drops to low on small touch screens and few cores', () => {
    expect(pickQuality({ cores: 4, coarse: true, width: 390, memory: 4 })).toBe('low')
    expect(pickQuality({ cores: 8, coarse: true, width: 1024, memory: 8 })).toBe('mid')
    expect(pickQuality({ cores: 12, coarse: false, width: 1440, memory: 16 })).toBe('high')
    expect(pickQuality({ cores: 12, coarse: false, width: 1440, memory: 2 })).toBe('low')
  })

  it('keeps aspect ratio with the short side fixed by quality', () => {
    expect(simSize(1440, 900, 128)).toEqual({ w: 205, h: 128 })
    expect(simSize(390, 844, 128)).toEqual({ w: 128, h: 277 })
    expect(simSize(844, 390, 128)).toEqual({ w: 277, h: 128 })
  })
})
