import { describe, expect, it } from 'vitest'
import { LAYER_AT, layerStep } from './steps'

describe('layerStep', () => {
  it('starts on the preparation step', () => {
    expect(layerStep(0)).toBe(0)
  })

  it('switches the text only once a layer is half way in', () => {
    for (const [i, at] of LAYER_AT.entries()) {
      expect(layerStep(at)).toBe(i)
      expect(layerStep(at + 0.05)).toBe(i + 1)
    }
  })

  it('ends on the top coat', () => {
    expect(layerStep(1)).toBe(3)
  })
})
