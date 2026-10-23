import { describe, expect, it } from 'vitest'
import { previousWorkday, windowForDay } from './standup-window'

// Outubro de 2026: dia 19 é segunda, 23 é sexta, 24 é sábado, 25 é domingo.
const at = (day: number) => new Date(2026, 9, day, 9, 30)

describe('previousWorkday', () => {
  it('de terça a sexta, é o dia anterior', () => {
    expect(previousWorkday(at(21))).toMatchObject({ first: '2026-10-20', last: '2026-10-20' })
    expect(previousWorkday(at(23))).toMatchObject({ first: '2026-10-22', last: '2026-10-22' })
  })

  it('na segunda, vai de sexta até domingo', () => {
    expect(previousWorkday(at(26))).toMatchObject({ first: '2026-10-23', last: '2026-10-25' })
  })

  it('no sábado, é sexta', () => {
    expect(previousWorkday(at(24))).toMatchObject({ first: '2026-10-23', last: '2026-10-23' })
  })

  it('no domingo, vai de sexta até sábado', () => {
    expect(previousWorkday(at(25))).toMatchObject({ first: '2026-10-23', last: '2026-10-24' })
  })

  it('começa e termina à meia-noite local', () => {
    const { from, to } = previousWorkday(at(23))
    expect([from.getDate(), from.getHours(), to.getDate(), to.getHours()]).toEqual([22, 0, 23, 0])
  })
})

describe('windowForDay', () => {
  it('cobre um dia inteiro local', () => {
    const { from, to } = windowForDay('2026-10-22')
    expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})
