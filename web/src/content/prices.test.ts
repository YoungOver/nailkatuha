import { describe, expect, it } from 'vitest'
import { formatDuration, formatRub, groupPrices, tidy, type PriceItem } from './prices'

const items: PriceItem[] = [
  { id: 2, category: 'Покрытие', categoryOrder: 1, name: 'длина 1-2', description: '(однотон)', priceRub: 2000, durationMin: 120, order: 1 },
  { id: 1, category: 'Снятие', categoryOrder: 0, name: 'Маникюр без покрытия', description: '', priceRub: 1000, durationMin: 60, order: 0 },
  { id: 3, category: 'Покрытие', categoryOrder: 1, name: 'длина 1-2 + дизайн', description: '', priceRub: 2500, durationMin: 120, order: 2 },
]

describe('prices', () => {
  it('formats rubles with no-break spaces the display font has glyphs for', () => {
    expect(formatRub(2500)).toBe('2 500 ₽')
    expect(formatRub(1000)).toBe('1 000 ₽')
    expect(formatRub(900)).toBe('900 ₽')
  })

  it('tidies API text without eating inner brackets', () => {
    expect(tidy('(однотон)')).toBe('Однотон')
    expect(tidy('коррекция длина 3–5 (1.5–2 см)')).toBe('Коррекция длина 3–5 (1.5–2 см)')
    expect(tidy('длина 1-2')).toBe('Длина 1-2')
    expect(tidy('')).toBe('')
  })

  it('groups by category order, items by item order', () => {
    const g = groupPrices(items)
    expect(g.map((c) => c.name)).toEqual(['Снятие', 'Покрытие'])
    expect(g[1].items.map((i) => i.id)).toEqual([2, 3])
  })
})

describe('formatDuration', () => {
  it('reads like a person would say it', () => {
    expect(formatDuration(60)).toBe('1 ч')
    expect(formatDuration(150)).toBe('2 ч 30 мин')
    expect(formatDuration(45)).toBe('45 мин')
    expect(formatDuration(180)).toBe('3 ч')
  })
})
