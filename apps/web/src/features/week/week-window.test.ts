import { describe, expect, it } from 'vitest'
import { weekOf } from './week-window'

describe('weekOf', () => {
  it('vai de segunda a domingo, qualquer que seja o dia', () => {
    for (const day of ['2026-10-26', '2026-10-28', '2026-11-01']) {
      expect(weekOf(day)).toMatchObject({ first: '2026-10-26', last: '2026-11-01' })
    }
  })

  it('começa e termina à meia-noite local', () => {
    const week = weekOf('2026-10-27')
    expect(week.from.getHours()).toBe(0)
    expect(week.from.getDay()).toBe(1)
    expect(week.to.getTime() - week.from.getTime()).toBeGreaterThanOrEqual(
      7 * 86_400_000 - 3_600_000,
    )
  })
})
