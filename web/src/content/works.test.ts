import { describe, expect, it } from 'vitest'
import { srcSet, works } from './works'

describe('works', () => {
  it('has all 18 photos tagged with alt text', () => {
    expect(works).toHaveLength(18)
    for (const w of works) {
      expect(w.alt.length).toBeGreaterThan(10)
      expect(w.styles.length).toBeGreaterThan(0)
    }
  })

  it('builds a srcset in ascending widths', () => {
    expect(srcSet({ id: 6, widths: [480, 960, 1080] }, 'avif')).toBe(
      '/works/work-6-480.avif 480w, /works/work-6-960.avif 960w, /works/work-6-1080.avif 1080w',
    )
  })
})
