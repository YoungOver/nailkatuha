/*
 * Booking on the site itself, without a trip to a Telegram bot. Free times come
 * from the studio API when one is configured; on the static demo they are made
 * up from the date, the same on every visit, so a reload does not reshuffle them.
 */

const OPEN = 10 * 60
const CLOSE = 21 * 60
const STEP = 30
/* a visit can be booked no sooner than an hour from now */
const LEAD = 60

export type Slot = { time: string; free: boolean }
export type BookingDay = { iso: string; date: Date; label: string }

const pad = (n: number) => String(n).padStart(2, '0')

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* a small string hash, so "taken" is stable for a given day and time */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

export function slotsFor(day: Date, minutes: number, now: Date): Slot[] {
  const iso = isoDay(day)
  const today = iso === isoDay(now)
  const earliest = today ? now.getHours() * 60 + now.getMinutes() + LEAD : 0
  const slots: Slot[] = []
  for (let start = OPEN; start + minutes <= CLOSE; start += STEP) {
    if (start < earliest) continue
    const time = `${pad(Math.floor(start / 60))}:${pad(start % 60)}`
    slots.push({ time, free: hash(`${iso} ${time}`) > 0.35 })
  }
  return slots
}

const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

export function dayLabel(d: Date, index: number) {
  if (index === 0) return 'Сегодня'
  if (index === 1) return 'Завтра'
  return `${weekday.format(d)}, ${dayMonth.format(d)}`
}

export function bookingDays(now: Date, count = 14): BookingDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    return { iso: isoDay(date), date, label: dayLabel(date, i) }
  })
}

/** Digits of a Russian number as 7XXXXXXXXXX: a leading 8 or a missing country code become 7. */
export function phoneDigits(input: string) {
  let d = input.replace(/\D/g, '')
  if (!d) return ''
  if (d[0] === '8') d = '7' + d.slice(1)
  else if (d[0] !== '7') d = '7' + d
  return d.slice(0, 11)
}

export function formatPhone(input: string) {
  const d = phoneDigits(input)
  if (!d) return ''
  let s = '+7'
  if (d.length > 1) s += ` (${d.slice(1, 4)}`
  if (d.length > 4) s += `) ${d.slice(4, 7)}`
  if (d.length > 7) s += `-${d.slice(7, 9)}`
  if (d.length > 9) s += `-${d.slice(9, 11)}`
  return s
}

export function phoneValid(input: string) {
  return phoneDigits(input).length === 11
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')

/** A calendar file for the visit, so it lands in the phone's calendar with one tap. */
export function icsFor({ title, start, minutes, address }: { title: string; start: Date; minutes: number; address: string }) {
  const end = new Date(start.getTime() + minutes * 60000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//nailkatuha//booking//RU',
    'BEGIN:VEVENT',
    `UID:${stamp(start)}-${Math.round(hash(title + stamp(start)) * 1e9)}@nailkatuha`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title)}`,
    `LOCATION:${escape(address)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
