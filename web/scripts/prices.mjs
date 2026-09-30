import { readFileSync, writeFileSync } from 'node:fs'

const src = JSON.parse(readFileSync(new URL('../../_ref/prices.json', import.meta.url), 'utf8'))

const items = src.map((s) => ({
  id: s.id,
  category: s.category,
  categoryOrder: s.category_order,
  name: s.name,
  description: s.description,
  priceRub: s.price_rub,
  durationMin: s.duration_min,
  order: s.order,
}))

writeFileSync(new URL('../src/content/prices.json', import.meta.url), JSON.stringify(items, null, 2) + '\n')
console.log(`prices: ${items.length}`)
