import { LacquerButton } from '@/components/LacquerButton'
import { studio } from '@/content/studio'

export function Booking() {
  return (
    <section id="booking" className="section booking" aria-labelledby="booking-title">
      <div className="safe-x booking__inner">
        <h2 id="booking-title" className="section__title font-display">
          Записаться
        </h2>
        <p className="section__lead">{studio.bookingLead}</p>
        <p className="booking__note">Окошки открываются на месяц вперёд. В боте видно свободное время, запись занимает минуту.</p>
        <LacquerButton href={studio.bot} target="_blank" rel="noopener">
          Выбрать окошко в Telegram
        </LacquerButton>
      </div>
    </section>
  )
}
