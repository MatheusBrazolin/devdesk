import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../domain/calendar-event.js'
import { buildIcs, escapeText, foldLine } from './ics.js'

const base = {
  id: '0b7e5a4c-3f0e-4d43-9a57-2f0f6f5d7c11',
  userId: 'u',
  description: '',
  kind: 'event' as const,
  link: null,
  createdAt: new Date('2026-10-20T10:00:00Z'),
  updatedAt: new Date('2026-10-20T10:00:00Z'),
}
const now = new Date('2026-10-23T12:00:00Z')

describe('escapeText', () => {
  it('escapa os caracteres especiais da RFC', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne')
  })

  it('CR sozinho também vira quebra escapada, e controles somem', () => {
    const backslash = String.fromCharCode(92)
    expect(escapeText('a\rb')).toBe(`a${backslash}nb`)
    expect(escapeText('a\u0007b\u0000c\td')).toBe('abc\td')
  })

  it('cada caractere especial ganha exatamente uma barra na frente', () => {
    // Conferido por código de caractere, para não depender de como o texto está escrito aqui.
    const backslash = String.fromCharCode(92)
    for (const char of [',', ';', backslash]) {
      expect(escapeText(char)).toBe(backslash + char)
    }
    expect(escapeText('\n')).toBe(backslash + 'n')
  })
})

describe('foldLine', () => {
  it('não mexe em linha curta', () => {
    expect(foldLine('SUMMARY:curto')).toBe('SUMMARY:curto')
  })

  it('dobra em 75 bytes e continua com espaço', () => {
    const folded = foldLine(`DESCRIPTION:${'x'.repeat(200)}`)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(2)
    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true)
    expect(lines.slice(1).every((line) => line.startsWith(' '))).toBe(true)
    expect(folded.replaceAll('\r\n ', '')).toBe(`DESCRIPTION:${'x'.repeat(200)}`)
  })

  it('não corta um acento ao meio', () => {
    const folded = foldLine(`SUMMARY:${'ã'.repeat(60)}`)
    expect(folded.replaceAll('\r\n ', '')).toBe(`SUMMARY:${'ã'.repeat(60)}`)
    for (const line of folded.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
})

describe('buildIcs', () => {
  it('dia inteiro vira DATE, com DTEND no dia seguinte ao último', () => {
    const event: CalendarEvent = {
      ...base,
      title: 'Offsite',
      allDay: true,
      date: '2026-10-29',
      endDate: '2026-10-30',
    }
    const ics = buildIcs([event], [], now)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261029\r\n')
    expect(ics).toContain('DTEND;VALUE=DATE:20261031\r\n')
  })

  it('com horário vira instante UTC; sem fim, dura 30 minutos', () => {
    const event: CalendarEvent = {
      ...base,
      title: 'Daily',
      allDay: false,
      startsAt: new Date('2026-10-26T12:30:00Z'),
      endsAt: null,
    }
    const ics = buildIcs([event], [], now)
    expect(ics).toContain('DTSTART:20261026T123000Z\r\n')
    expect(ics).toContain('DTEND:20261026T130000Z\r\n')
  })

  it('lembrete ganha um alarme na hora', () => {
    const event: CalendarEvent = {
      ...base,
      kind: 'reminder',
      title: 'Cobrar review',
      allDay: false,
      startsAt: new Date('2026-10-26T17:00:00Z'),
      endsAt: null,
    }
    expect(buildIcs([event], [], now)).toContain('BEGIN:VALARM\r\nACTION:DISPLAY')
  })

  it('prazo de milestone vira evento de dia inteiro com o link', () => {
    const ics = buildIcs(
      [],
      [
        {
          id: 'x',
          title: 'Sprint 42',
          date: '2026-10-27',
          url: 'https://github.com/acme/web/milestone/42',
          repository: 'acme/web',
          items: 2,
        },
      ],
      now,
    )
    expect(ics).toContain('SUMMARY:Prazo: Sprint 42 (acme/web)')
    expect(ics).toContain('URL:https://github.com/acme/web/milestone/42')
  })

  it('usa CRLF e fecha o calendário', () => {
    const ics = buildIcs([], [], now)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n')
  })
})
