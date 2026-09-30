import { YandexMap } from '@/components/YandexMap'
import { studio } from '@/content/studio'

const [lat, lon] = studio.coords
const route = `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=mt`

export function Contacts() {
  return (
    <section id="contacts" className="section contacts" aria-labelledby="contacts-title">
      <div className="safe-x contacts__grid">
        <div className="contacts__info">
          <h2 id="contacts-title" className="section__title font-display">
            Как добраться
          </h2>
          <address className="contacts__address">
            <span className="contacts__street">{studio.address}</span>
            <span>{studio.city}</span>
          </address>
          <p className="contacts__metro">
            <span className="contacts__line" aria-hidden="true" />
            метро {studio.metro.name}, {studio.metro.line.toLowerCase()}
          </p>
          <p>
            <a className="text-link" href={route} target="_blank" rel="noopener">
              Построить маршрут в Яндекс Картах
            </a>
          </p>
          <ul className="contacts__socials">
            {studio.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener" className="chip">
                  {s.label}
                  {s.note}
                </a>
              </li>
            ))}
          </ul>
          <p className="contacts__note">{studio.metaNote}</p>
        </div>
        <YandexMap coords={studio.coords} label={`nailkatuha, ${studio.address}`} />
      </div>
    </section>
  )
}
