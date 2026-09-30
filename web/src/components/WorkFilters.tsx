'use client'

import { styleLabel, type Style, type Work } from '@/content/works'

export type StyleFilter = Style | 'all'

const ORDER: StyleFilter[] = ['all', 'moodboard', 'art', 'chrome', 'french', 'nude']

export function matchesStyle(w: Work, f: StyleFilter) {
  return f === 'all' || w.styles.includes(f)
}

export function WorkFilters({ works, value, onChange }: { works: Work[]; value: StyleFilter; onChange: (f: StyleFilter) => void }) {
  return (
    <div className="chips" role="group" aria-label="Стиль">
      {ORDER.map((f) => {
        const count = works.filter((w) => matchesStyle(w, f)).length
        return (
          <button key={f} type="button" className="chip" aria-pressed={value === f} onClick={() => onChange(f)}>
            {f === 'all' ? 'Все' : styleLabel[f]}
            <span className="chip__count">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
