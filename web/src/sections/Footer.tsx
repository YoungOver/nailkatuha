import { studio } from '@/content/studio'

const base = process.env.NEXT_PUBLIC_BASE ?? ''

export function Footer() {
  return (
    <footer className="footer safe-x">
      <div className="footer__cols">
        <nav aria-label="Разделы сайта">
          <a href={`${base}/#works`}>Работы</a>
          <a href={`${base}/portfolio/`}>Портфолио</a>
          <a href={`${base}/#prices`}>Цены</a>
          <a href={`${base}/#booking`}>Записаться</a>
        </nav>
        <div className="footer__contacts">
          <span>{studio.address}</span>
          <a href={`mailto:${studio.email}`}>{studio.email}</a>
          <a href={studio.bot} target="_blank" rel="noopener">
            Бот для записи
          </a>
        </div>
      </div>
      <p className="footer__word font-display" aria-hidden="true">
        nailkatuha
      </p>
      <p className="footer__legal">© 2026 nailkatuha. Маникюр и nail art в <span className="whitespace-nowrap">Санкт-Петербурге</span>.</p>
    </footer>
  )
}
