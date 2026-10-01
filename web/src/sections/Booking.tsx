'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { bookingDays, formatPhone, icsFor, phoneDigits, phoneValid, slotsFor, type BookingDay } from '@/content/booking'
import { formatDuration, formatRub, priceGroups, prices, tidy } from '@/content/prices'
import { studio } from '@/content/studio'

const api = process.env.NEXT_PUBLIC_API ?? ''

type Done = { title: string; day: string; time: string; start: Date; minutes: number; demo: boolean }
type Errors = Partial<Record<'service' | 'time' | 'name' | 'phone' | 'consent', string>>

/* with a studio API the request goes there; the static demo keeps it in the browser and says so */
async function send(body: object): Promise<{ demo: boolean }> {
  if (api) {
    const r = await fetch(`${api}/api/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) throw new Error(String(r.status))
    return { demo: false }
  }
  await new Promise((r) => setTimeout(r, 500))
  try {
    const all = JSON.parse(localStorage.getItem('nk-bookings') ?? '[]')
    localStorage.setItem('nk-bookings', JSON.stringify([...all, body]))
  } catch {}
  return { demo: true }
}

function title(id: number) {
  const p = prices.find((x) => x.id === id)!
  return p.description ? `${tidy(p.name)}: ${tidy(p.description).toLowerCase()}` : tidy(p.name)
}

/** Booking right on the page: service, day, time and a phone number. No messenger and no sign-in. */
export function Booking() {
  const [now, setNow] = useState<Date | null>(null)
  const [service, setService] = useState<number | null>(null)
  const [day, setDay] = useState<string>('')
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'failed'>('idle')
  const [done, setDone] = useState<Done | null>(null)
  const doneRef = useRef<HTMLDivElement>(null)

  /* the calendar depends on the visitor's clock, so it is built after hydration */
  useEffect(() => {
    const n = new Date()
    setNow(n)
    /* late in the evening today has nothing left, so the first day with a free time is preselected */
    const open = bookingDays(n).find((d) => slotsFor(d.date, 60, n).some((s) => s.free))
    setDay(open?.iso ?? bookingDays(n)[0].iso)
    const fromUrl = Number(new URLSearchParams(location.search).get('service'))
    if (prices.some((p) => p.id === fromUrl)) setService(fromUrl)
    /* a price line chooses its service and the page scrolls here */
    const onClick = (e: MouseEvent) => {
      const line = (e.target as Element | null)?.closest?.<HTMLElement>('[data-service]')
      if (line) setService(Number(line.dataset.service))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const days: BookingDay[] = useMemo(() => (now ? bookingDays(now) : []), [now])
  const item = prices.find((p) => p.id === service)
  const chosenDay = days.find((d) => d.iso === day)
  const slots = useMemo(() => (now && chosenDay ? slotsFor(chosenDay.date, item?.durationMin ?? 60, now) : []), [now, chosenDay, item])

  useEffect(() => {
    if (time && !slots.some((s) => s.time === time && s.free)) setTime('')
  }, [slots, time])

  useEffect(() => {
    if (done) doneRef.current?.focus()
  }, [done])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!item) next.service = 'Выберите услугу'
    if (!time) next.time = 'Выберите время'
    if (!name.trim()) next.name = 'Как к вам обращаться?'
    if (!phoneValid(phone)) next.phone = 'Нужен номер целиком: +7 и 10 цифр'
    if (!consent) next.consent = 'Без согласия мастер не сможет вам позвонить'
    setErrors(next)
    if (Object.keys(next).length || !item || !chosenDay) {
      document.querySelector<HTMLElement>('.booking [aria-invalid="true"], .booking [data-error]')?.focus()
      return
    }
    setStatus('sending')
    try {
      const [h, m] = time.split(':').map(Number)
      const start = new Date(chosenDay.date.getFullYear(), chosenDay.date.getMonth(), chosenDay.date.getDate(), h, m)
      const res = await send({ service: item.id, start: start.toISOString(), name: name.trim(), phone: phoneDigits(phone), note: note.trim() })
      setDone({ title: title(item.id), day: chosenDay.label, time, start, minutes: item.durationMin, demo: res.demo })
      setStatus('idle')
    } catch {
      setStatus('failed')
    }
  }

  const calendar = () => {
    if (!done) return
    const blob = new Blob([icsFor({ title: `nailkatuha: ${done.title}`, start: done.start, minutes: done.minutes, address: `${studio.address}, ${studio.city}` })], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nailkatuha.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const again = () => {
    setDone(null)
    setTime('')
  }

  return (
    <section id="booking" className="booking" aria-labelledby="booking-title">
      <div className="wrap booking__wrap">
        <header className="booking__head">
          <p className="eyebrow">Запись</p>
          <h2 id="booking-title" className="section-title">
            Окошко за минуту.
            <br />
            Без звонков.
          </h2>
          <p className="section-lead">Выберите услугу, день и время, оставьте телефон. Мастер подтвердит запись.</p>
        </header>

        {done ? (
          <div ref={doneRef} className="booking__done" tabIndex={-1} aria-live="polite">
            <h3>Вы записаны</h3>
            <p className="booking__done-what">{done.title}</p>
            <p className="booking__done-when">
              {done.day}, {done.time}
            </p>
            <p className="booking__done-where">
              {studio.address}, {studio.city}
            </p>
            <div className="booking__done-actions">
              <button type="button" className="lacquer-btn" onClick={calendar}>
                <span className="lacquer-btn__label">Добавить в календарь</span>
              </button>
              <button type="button" className="ghost-btn" onClick={again}>
                Новая запись
              </button>
            </div>
            {done.demo && <p className="booking__demo">Сайт работает в демо-режиме: заявка сохранена в этом браузере и мастеру не отправлена.</p>}
          </div>
        ) : (
          <form className="booking__form" onSubmit={submit} noValidate>
            <fieldset className="booking__field booking__services" data-error={errors.service ? '' : undefined} tabIndex={errors.service ? -1 : undefined}>
              <legend>Услуга</legend>
              {priceGroups.map((g) => (
                <div key={g.name} className="booking__group">
                  <p className="booking__group-name">{g.name}</p>
                  {g.items.map((p) => (
                    <label key={p.id} className="booking__service">
                      <input type="radio" name="service" checked={service === p.id} onChange={() => setService(p.id)} />
                      <span className="booking__service-name">
                        {tidy(p.name)}
                        {p.description && <small>{tidy(p.description)}</small>}
                      </span>
                      <span className="booking__service-meta">
                        {formatRub(p.priceRub)}
                        <small>{formatDuration(p.durationMin)}</small>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
              {errors.service && <p className="booking__error">{errors.service}</p>}
            </fieldset>

            <fieldset className="booking__field">
              <legend>День</legend>
              <div className="booking__days" role="radiogroup" aria-label="День">
                {days.map((d) => (
                  <label key={d.iso} className="booking__day">
                    <input type="radio" name="day" checked={day === d.iso} onChange={() => setDay(d.iso)} />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="booking__field" data-error={errors.time ? '' : undefined} tabIndex={errors.time ? -1 : undefined}>
              <legend>Время{item ? `, ${formatDuration(item.durationMin)}` : ''}</legend>
              {slots.some((s) => s.free) ? (
                <div className="booking__times">
                  {slots.map((s) => (
                    <label key={s.time} className="booking__time" data-taken={s.free ? undefined : ''}>
                      <input type="radio" name="time" disabled={!s.free} checked={time === s.time} onChange={() => setTime(s.time)} />
                      <span>{s.time}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="booking__empty">{now ? 'На этот день всё занято. Выберите другой.' : 'Загружаю свободное время'}</p>
              )}
              {errors.time && <p className="booking__error">{errors.time}</p>}
            </fieldset>

            <fieldset className="booking__field booking__contact">
              <legend>Как с вами связаться</legend>
              <label className="booking__input">
                <span>Имя</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" aria-invalid={errors.name ? true : undefined} />
                {errors.name && <small className="booking__error">{errors.name}</small>}
              </label>
              <label className="booking__input">
                <span>Телефон</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+7 (900) 000-00-00"
                  aria-invalid={errors.phone ? true : undefined}
                />
                {errors.phone && <small className="booking__error">{errors.phone}</small>}
              </label>
              <label className="booking__input booking__input--wide">
                <span>Пожелания, если есть</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </label>
              <label className="booking__consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={errors.consent ? true : undefined} />
                <span>Даю согласие на обработку имени и телефона для записи</span>
              </label>
              {errors.consent && <p className="booking__error">{errors.consent}</p>}
            </fieldset>

            <div className="booking__submit">
              <button type="submit" className="lacquer-btn" disabled={status === 'sending'}>
                <span className="lacquer-btn__label">{status === 'sending' ? 'Записываю' : chosenDay && time ? `Записаться: ${chosenDay.label.toLowerCase()}, ${time}` : 'Записаться'}</span>
              </button>
              {status === 'failed' && <p className="booking__error">Запись не прошла. Проверьте интернет и попробуйте ещё раз.</p>}
              {item && (
                <p className="booking__summary">
                  {tidy(item.name)}, {formatRub(item.priceRub)}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
