import { LacquerButton } from '@/components/LacquerButton'
import { studio } from '@/content/studio'

const STEPS = [
  { title: 'Выберите услугу', text: 'Покрытие, наращивание или снятие. Цена и время видны сразу.' },
  { title: 'Возьмите окошко', text: 'Свободное время открыто на месяц вперёд.' },
  { title: 'Получите подтверждение', text: 'Бот пришлёт время и адрес в Telegram, их не придётся искать.' },
]

export function Booking() {
  return (
    <section id="booking" className="booking" aria-labelledby="booking-title">
      <div className="wrap">
        <div className="booking__panel" data-reveal="scale">
          <div className="booking__intro">
            <h2 id="booking-title" className="section-title">
              Запишитесь на окошко
            </h2>
            <p className="section-lead">{studio.bookingLead}</p>
            <LacquerButton href={studio.bot} target="_blank" rel="noopener">
              Выбрать окошко в Telegram
            </LacquerButton>
          </div>
          <ol className="booking__steps">
            {STEPS.map((s) => (
              <li key={s.title} className="booking__step">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
