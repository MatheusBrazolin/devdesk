import { describe, expect, it } from 'vitest'
import { addDays, assertValidTiming } from './calendar-event.js'

describe('assertValidTiming', () => {
  it('aceita dia inteiro de um dia só ou de vários', () => {
    expect(() =>
      assertValidTiming({ allDay: true, date: '2026-10-24', endDate: null }),
    ).not.toThrow()
    expect(() =>
      assertValidTiming({ allDay: true, date: '2026-10-24', endDate: '2026-10-26' }),
    ).not.toThrow()
  })

  it('recusa último dia antes do primeiro', () => {
    expect(() =>
      assertValidTiming({ allDay: true, date: '2026-10-24', endDate: '2026-10-23' }),
    ).toThrow(/antes do primeiro/)
  })

  it('recusa fim antes ou igual ao começo', () => {
    const startsAt = new Date('2026-10-24T13:00:00Z')
    expect(() => assertValidTiming({ allDay: false, startsAt, endsAt: startsAt })).toThrow(
      /depois do começo/,
    )
  })

  it('recusa eventos longos demais', () => {
    expect(() =>
      assertValidTiming({ allDay: true, date: '2026-01-01', endDate: '2026-06-01' }),
    ).toThrow(/até 62 dias/)
  })
})

describe('addDays', () => {
  it('vira o mês e o ano', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('não sofre com o horário de verão', () => {
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
  })
})
