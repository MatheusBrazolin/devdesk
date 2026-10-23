import type { CalendarEvent } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import {
  addDaysToKey,
  compareEvents,
  dateKey,
  eventSpan,
  gridRange,
  monthGrid,
  occursOn,
  parseMonth,
} from './calendar-dates'

const base = {
  id: '0b7e5a4c-3f0e-4d43-9a57-2f0f6f5d7c11',
  description: '',
  kind: 'event' as const,
  link: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}
const allDay = (title: string, date: string, endDate: string | null = null): CalendarEvent => ({
  ...base,
  title,
  allDay: true,
  date,
  endDate,
})
const timed = (title: string, startsAt: Date, endsAt: Date | null = null): CalendarEvent => ({
  ...base,
  title,
  allDay: false,
  startsAt: startsAt.toISOString(),
  endsAt: endsAt?.toISOString() ?? null,
})

describe('monthGrid', () => {
  it('outubro de 2026 começa no domingo 27/09 e tem seis semanas', () => {
    const weeks = monthGrid(2026, 9)
    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[0]![0]).toBe('2026-09-27')
    expect(weeks[0]![4]).toBe('2026-10-01') // 1º de outubro de 2026 é quinta
    expect(weeks[5]![6]).toBe('2026-11-07')
  })

  it('mês que começa no domingo não ganha uma semana vazia antes', () => {
    expect(monthGrid(2026, 10)[0]![0]).toBe('2026-11-01') // 1º de novembro de 2026 é domingo
  })

  it('fevereiro de ano bissexto termina no dia 29', () => {
    expect(monthGrid(2028, 1).flat()).toContain('2028-02-29')
  })
})

describe('gridRange', () => {
  it('vai do primeiro ao último dia da grade', () => {
    expect(gridRange(2026, 9)).toEqual({ from: '2026-09-27', to: '2026-11-07' })
  })
})

describe('parseMonth', () => {
  const today = new Date(2026, 9, 23)
  it('lê AAAA-MM', () => expect(parseMonth('2027-01', today)).toEqual({ year: 2027, month: 0 }))
  it('valor inválido cai no mês atual', () => {
    expect(parseMonth('2026-13', today)).toEqual({ year: 2026, month: 9 })
    expect(parseMonth(undefined, today)).toEqual({ year: 2026, month: 9 })
  })
})

describe('addDaysToKey', () => {
  it('vira mês e ano', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('eventSpan e occursOn', () => {
  it('evento de vários dias ocupa todos, inclusive o último', () => {
    const event = allDay('Offsite', '2026-10-29', '2026-10-31')
    expect(
      ['2026-10-28', '2026-10-29', '2026-10-31', '2026-11-01'].map((d) => occursOn(event, d)),
    ).toEqual([false, true, true, false])
  })

  it('evento com horário cai no dia local de quem olha', () => {
    const start = new Date(2026, 9, 31, 23, 30) // 31/10 às 23h30, horário local
    expect(eventSpan(timed('Virada', start)).first).toBe('2026-10-31')
  })

  it('evento que termina à meia-noite não invade o dia seguinte', () => {
    const event = timed('Até meia-noite', new Date(2026, 9, 24, 22), new Date(2026, 9, 25, 0))
    expect(eventSpan(event)).toEqual({ first: '2026-10-24', last: '2026-10-24' })
  })
})

describe('compareEvents', () => {
  it('dia inteiro primeiro, depois por horário', () => {
    const events = [
      timed('Tarde', new Date(2026, 9, 24, 15)),
      allDay('Feriado', '2026-10-24'),
      timed('Manhã', new Date(2026, 9, 24, 9)),
    ]
    expect(events.sort(compareEvents).map((e) => e.title)).toEqual(['Feriado', 'Manhã', 'Tarde'])
  })
})

describe('dateKey', () => {
  it('usa a data local, não a UTC', () => {
    expect(dateKey(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24')
  })
})
