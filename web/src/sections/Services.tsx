import { studio } from '@/content/studio'

export function Services() {
  return (
    <section id="services" className="services" aria-labelledby="services-title">
      <div className="wrap services__head">
        <p className="eyebrow" data-reveal>
          Услуги
        </p>
        <h2 id="services-title" className="section-title" data-reveal>
          Что делаем.
          <br />
          И как.
        </h2>
        <p className="section-lead" data-reveal>
          Каждая услуга расписана по шагам, <b>чтобы вы заранее знали, что будет с ногтями.</b>
        </p>
      </div>
      <div className="wrap services__grid">
        {studio.services.map((s) => (
          <article key={s.title} className="service" data-reveal>
            <h3 className="service__title">{s.title}</h3>
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
