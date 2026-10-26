import type { CalendarEvent } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { focusWindow, formatDuration } from './free-time'

const at = (time: string) => Date.parse(`2026-10-26T${time}:00Z`)

function meeting(start: string, end: string | null, kind: 'event' | 'reminder' = 'event') {
  return {
    id: `${start}-${kind}`,
    title: `Reunião ${start}`,
    description: '',
    kind,
    link: null,
    createdAt: '',
    updatedAt: '',
    allDay: false,
    startsAt: new Date(at(start)).toISOString(),
    endsAt: end && new Date(at(end)).toISOString(),
  } satisfies CalendarEvent
}

describe('focusWindow', () => {
  it('em reunião, diz até quando', () => {
    const window = focusWindow([meeting('09:30', '09:45')], at('09:40'))
    expect(window).toMatchObject({ kind: 'busy', endsAt: at('09:45') })
  })

  it('sugere o maior bloco que cabe com folga para a próxima', () => {
    const events = [meeting('14:00', '15:00'), meeting('11:00', '12:00')]
    expect(focusWindow(events, at('10:00'))).toMatchObject({
      kind: 'free',
      minutes: 60,
      suggestion: 50,
      next: { title: 'Reunião 11:00' },
    })
    expect(focusWindow(events, at('10:25'))).toMatchObject({ minutes: 35, suggestion: 25 })
    expect(focusWindow(events, at('10:45'))).toMatchObject({ minutes: 15, suggestion: null })
  })

  it('lembrete e evento sem fim não ocupam a agenda', () => {
    const events = [meeting('10:30', null, 'reminder'), meeting('09:00', null)]
    expect(focusWindow(events, at('09:10'))).toEqual({
      kind: 'free',
      minutes: null,
      next: null,
      suggestion: 50,
    })
  })
})

describe('focusWindow, virada do dia', () => {
  it('a reunião de amanhã não conta como limite de hoje', () => {
    const tomorrow = { ...meeting('10:00', '11:00'), startsAt: '2026-10-28T13:00:00.000Z' }
    expect(focusWindow([tomorrow], at('15:00'))).toMatchObject({ kind: 'free', minutes: null })
  })
})

describe('formatDuration', () => {
  it('em minutos e horas', () => {
    expect(formatDuration(40)).toBe('40 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(95)).toBe('1 h 35 min')
  })
})
