import { studio } from '@/content/studio'

export function Services() {
  return (
    <section id="services" className="section services" aria-labelledby="services-title">
      <div className="safe-x services__head">
        <h2 id="services-title" className="section__title font-display">
          Что делаем
        </h2>
        <p className="services__lead">Каждая услуга расписана по шагам, чтобы вы заранее знали, что будет с ногтями.</p>
      </div>

      <div className="safe-x">
        {studio.services.map((s) => (
          <article key={s.title} className="service">
            <h3 className="service__title font-display">{s.title}</h3>
            <ul className="service__points">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
