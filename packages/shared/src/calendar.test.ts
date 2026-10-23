import { describe, expect, it } from 'vitest'
import { calendarRangeQuerySchema, createEventInputSchema, daysBetween } from './calendar.js'

describe('createEventInputSchema', () => {
  it('evento de dia inteiro usa data, sem fuso', () => {
    expect(
      createEventInputSchema.parse({ title: 'Feriado', allDay: true, date: '2026-11-02' }),
    ).toEqual({
      title: 'Feriado',
      description: '',
      kind: 'event',
      link: null,
      allDay: true,
      date: '2026-11-02',
      endDate: null,
    })
  })

  it('evento com horário usa instante', () => {
    const parsed = createEventInputSchema.parse({
      title: 'Daily',
      allDay: false,
      startsAt: '2026-10-26T12:30:00Z',
    })
    expect(parsed).toMatchObject({ allDay: false, startsAt: '2026-10-26T12:30:00Z', endsAt: null })
  })

  it('não aceita misturar: dia inteiro com horário', () => {
    expect(() =>
      createEventInputSchema.parse({ title: 'x', allDay: true, startsAt: '2026-10-26T12:30:00Z' }),
    ).toThrow()
  })

  it('exige título', () => {
    expect(() =>
      createEventInputSchema.parse({ title: '   ', allDay: true, date: '2026-11-02' }),
    ).toThrow()
  })

  it('recusa ano 0000, que o banco não aceita', () => {
    expect(() =>
      createEventInputSchema.parse({ title: 'x', allDay: true, date: '0000-01-01' }),
    ).toThrow()
    expect(() =>
      createEventInputSchema.parse({ title: 'x', allDay: false, startsAt: '0000-01-01T00:00:00Z' }),
    ).toThrow()
  })

  it('recusa data inválida', () => {
    expect(() =>
      createEventInputSchema.parse({ title: 'x', allDay: true, date: '2026-02-30' }),
    ).toThrow()
  })
})

describe('calendarRangeQuerySchema', () => {
  it('aceita um mês', () => {
    expect(calendarRangeQuerySchema.parse({ from: '2026-10-01', to: '2026-10-31' })).toBeTruthy()
  })

  it('recusa intervalo invertido', () => {
    expect(() => calendarRangeQuerySchema.parse({ from: '2026-10-31', to: '2026-10-01' })).toThrow()
  })

  it('recusa intervalo de mais de 400 dias', () => {
    expect(() => calendarRangeQuerySchema.parse({ from: '2026-01-01', to: '2027-12-31' })).toThrow()
  })
})

describe('daysBetween', () => {
  it('conta dias de calendário, inclusive na virada do horário de verão', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30)
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  })
})
