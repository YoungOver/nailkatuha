import { describe, expect, it } from 'vitest'
import { cursorCss, CURSOR_SIZE } from './cursor'

describe('nail-file cursor', () => {
  it('is a native cursor image small enough for every browser (≤ 128 px)', () => {
    expect(CURSOR_SIZE).toBeLessThanOrEqual(128)
    expect(cursorCss('#ff4f8b', false)).toMatch(/^url\("data:image\/svg\+xml,.+"\) \d+ \d+, auto$/)
  })

  it('paints the board in the chosen lacquer', () => {
    const css = decodeURIComponent(cursorCss('#9c8cff', false))
    expect(css).toContain('#9c8cff')
  })

  it('differs while filing something clickable', () => {
    expect(cursorCss('#ff4f8b', true)).not.toBe(cursorCss('#ff4f8b', false))
    expect(cursorCss('#ff4f8b', true)).toMatch(/, pointer$/)
  })
})
