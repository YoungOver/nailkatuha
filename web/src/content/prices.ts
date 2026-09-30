import raw from './prices.json'

export type PriceItem = {
  id: number
  category: string
  categoryOrder: number
  name: string
  description: string
  priceRub: number
  durationMin: number
  order: number
}

export type PriceGroup = { name: string; items: PriceItem[] }

const rub = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export function formatRub(value: number): string {
  return `${rub.format(value).replace(/\s/g, "\u00a0")}\u00a0₽`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

/** API names are lower-case fragments ("длина 1-2"); descriptions sometimes come wrapped in brackets. */
export function tidy(text: string): string {
  const t = text.trim().replace(/^\((.*)\)$/, '$1')
  return t ? t[0].toUpperCase() + t.slice(1) : t
}

export function groupPrices(items: PriceItem[]): PriceGroup[] {
  const sorted = [...items].sort((a, b) => a.categoryOrder - b.categoryOrder || a.order - b.order)
  const groups: PriceGroup[] = []
  for (const item of sorted) {
    const last = groups.at(-1)
    if (last?.name === item.category) last.items.push(item)
    else groups.push({ name: item.category, items: [item] })
  }
  return groups
}

export const prices: PriceItem[] = raw
export const priceGroups = groupPrices(prices)
