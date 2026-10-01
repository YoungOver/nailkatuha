import { formatDuration, formatRub, priceGroups, prices, tidy } from '@/content/prices'

const low = Math.min(...prices.map((p) => p.priceRub))
const high = Math.max(...prices.map((p) => p.priceRub))

export function Prices() {
  return (
    <section id="prices" className="prices" aria-labelledby="prices-title">
      <div className="wrap prices__head">
        <h2 id="prices-title" className="section-title" data-reveal>
          Цены
        </h2>
        <p className="prices__range" data-reveal>
          от {formatRub(low)} до {formatRub(high)}
        </p>
      </div>

      <div className="wrap prices__groups">
        {priceGroups.map((g) => (
          <div key={g.name} className="prices__group" data-reveal>
            <h3 className="prices__category">{g.name}</h3>
            <ul>
              {g.items.map((p) => (
                <li key={p.id}>
                  <a className="price-line" href={`?service=${p.id}#booking`}>
                    <span className="price-line__name">
                      {tidy(p.name)}
                      {p.description && <span className="price-line__desc">{tidy(p.description)}</span>}
                    </span>
                    <span className="price-line__value">
                      <span className="price-line__price">{formatRub(p.priceRub)}</span>
                      <span className="price-line__time">{formatDuration(p.durationMin)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="wrap prices__note">Снятие старого покрытия уже входит в покрытие и наращивание. Нажмите на строку, чтобы записаться на эту услугу.</p>
    </section>
  )
}
