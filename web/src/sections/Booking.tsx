import { LacquerButton } from '@/components/LacquerButton'
import { studio } from '@/content/studio'

const STEPS = [
  { title: 'Выберите услугу', text: 'Покрытие, наращивание или снятие. Цена и время видны сразу.' },
  { title: 'Возьмите окошко', text: 'Свободное время открыто на месяц вперёд.' },
  { title: 'Получите подтверждение', text: 'Бот пришлёт время и адрес в Telegram, их не придётся искать.' },
]

export function Booking() {
  return (
    <section id="booking" className="section booking" aria-labelledby="booking-title">
      <div className="safe-x booking__grid">
        <div className="booking__intro">
          <h2 id="booking-title" className="booking__title font-display">
            Запишитесь на окошко
          </h2>
          <p className="booking__lead">{studio.bookingLead}</p>
          <LacquerButton href={studio.bot} target="_blank" rel="noopener">
            Выбрать окошко в Telegram
          </LacquerButton>
        </div>
        <ol className="booking__steps">
          {STEPS.map((s) => (
            <li key={s.title} className="booking__step">
              <h3 className="font-display">{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
