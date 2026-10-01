import { describe, expect, it } from 'vitest'
import { OneEuro } from './oneEuro'

describe('One Euro filter', () => {
  it('irons out jitter on a hand that holds still', () => {
    const f = new OneEuro(1.2, 8)
    let out = 0
    const noise = [0.004, -0.006, 0.005, -0.003, 0.006, -0.005, 0.004, -0.004]
    for (let i = 0; i < 200; i++) out = f.filter(0.5 + noise[i % noise.length], i / 30)
    expect(Math.abs(out - 0.5)).toBeLessThan(0.002)
  })

  it('keeps up with a fast move instead of trailing behind it', () => {
    const f = new OneEuro(1.2, 8)
    for (let i = 0; i < 30; i++) f.filter(0.2, i / 30)
    let out = 0
    for (let i = 30; i < 36; i++) out = f.filter(0.2 + (i - 29) * 0.06, i / 30)
    expect(out).toBeGreaterThan(0.48)
  })

  it('passes the first sample through', () => {
    expect(new OneEuro().filter(0.7, 0)).toBe(0.7)
  })
})
