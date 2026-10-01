import { describe, expect, it } from 'vitest'
import { bookingDays, formatPhone, icsFor, phoneDigits, phoneValid, slotsFor } from './booking'

const day = (iso: string) => new Date(`${iso}T00:00:00`)

describe('booking slots', () => {
  it('offers half-hour starts that let the service end by closing time', () => {
    const slots = slotsFor(day('2026-10-05'), 120, day('2026-10-01'))
    expect(slots[0].time).toBe('10:00')
    expect(slots.at(-1)!.time).toBe('19:00')
    expect(slots.every((s) => /^\d{2}:(00|30)$/.test(s.time))).toBe(true)
  })

  it('is the same every time for the same day, so a reload does not reshuffle taken slots', () => {
    const a = slotsFor(day('2026-10-06'), 60, day('2026-10-01'))
    const b = slotsFor(day('2026-10-06'), 60, day('2026-10-01'))
    expect(a).toEqual(b)
    expect(a.some((s) => !s.free)).toBe(true)
    expect(a.some((s) => s.free)).toBe(true)
  })

  it('hides today’s times that are already past or less than an hour away', () => {
    const now = new Date('2026-10-01T14:10:00')
    const slots = slotsFor(day('2026-10-01'), 60, now)
    expect(slots[0].time).toBe('15:30')
  })

  it('lists two weeks of days starting today, named for people', () => {
    const days = bookingDays(new Date('2026-10-01T09:00:00'))
    expect(days).toHaveLength(14)
    expect(days[0].label).toBe('Сегодня')
    expect(days[1].label).toBe('Завтра')
    expect(days[2].label).toMatch(/^[а-я]{2}, 3 октября$/)
  })
})

describe('phone', () => {
  it('formats as the digits are typed and keeps a leading 8 as a Russian number', () => {
    expect(formatPhone('9')).toBe('+7 (9')
    expect(formatPhone('89161234567')).toBe('+7 (916) 123-45-67')
    expect(formatPhone('+7 916 123 45 67 89')).toBe('+7 (916) 123-45-67')
  })

  it('accepts only a full number', () => {
    expect(phoneValid('+7 (916) 123-45-6')).toBe(false)
    expect(phoneValid('+7 (916) 123-45-67')).toBe(true)
    expect(phoneDigits('+7 (916) 123-45-67')).toBe('79161234567')
  })
})

describe('calendar file', () => {
  it('describes the visit with its start, end and address', () => {
    const ics = icsFor({ title: 'Маникюр', start: new Date('2026-10-05T14:00:00'), minutes: 90, address: 'пр-кт Пятилеток, 17к5' })
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/)
    expect(ics).toContain('SUMMARY:Маникюр')
    expect(ics).toContain('LOCATION:пр-кт Пятилеток\\, 17к5')
    expect(ics.split('\r\n').length).toBeGreaterThan(8)
  })
})
