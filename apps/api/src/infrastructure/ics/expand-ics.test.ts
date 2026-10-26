import { describe, expect, it } from 'vitest'
import { expandIcs } from './expand-ics.js'

const calendar = (...events: string[]) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//teste//PT',
    'BEGIN:VTIMEZONE',
    'TZID:America/Sao_Paulo',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

const vevent = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n')

const from = new Date('2026-10-26T00:00:00Z')
const to = new Date('2026-11-02T00:00:00Z')

describe('expandIcs', () => {
  it('lê um evento com fuso e converte para UTC', () => {
    const events = expandIcs(
      calendar(
        vevent(
          'UID:a',
          'SUMMARY:Planejamento',
          'LOCATION:Sala 2',
          'DTSTART;TZID=America/Sao_Paulo:20261027T100000',
          'DTEND;TZID=America/Sao_Paulo:20261027T110000',
        ),
      ),
      from,
      to,
    )
    expect(events).toEqual([
      {
        id: expect.stringContaining('a@'),
        title: 'Planejamento',
        location: 'Sala 2',
        allDay: false,
        startsAt: new Date('2026-10-27T13:00:00Z'),
        endsAt: new Date('2026-10-27T14:00:00Z'),
      },
    ])
  })

  it('expande a daily dos dias úteis e respeita EXDATE e exceções', () => {
    const events = expandIcs(
      calendar(
        vevent(
          'UID:daily',
          'SUMMARY:Daily',
          'DTSTART;TZID=America/Sao_Paulo:20260105T093000',
          'DTEND;TZID=America/Sao_Paulo:20260105T094500',
          'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
          'EXDATE;TZID=America/Sao_Paulo:20261028T093000',
        ),
        vevent(
          'UID:daily',
          'SUMMARY:Daily (mais tarde)',
          'RECURRENCE-ID;TZID=America/Sao_Paulo:20261029T093000',
          'DTSTART;TZID=America/Sao_Paulo:20261029T110000',
          'DTEND;TZID=America/Sao_Paulo:20261029T111500',
        ),
      ),
      from,
      to,
    )
    const summary = events.map((e) => [
      e.title,
      e.allDay ? e.date : e.startsAt.toISOString().slice(0, 16),
    ])
    expect(summary).toEqual([
      ['Daily', '2026-10-26T12:30'],
      ['Daily', '2026-10-27T12:30'],
      ['Daily (mais tarde)', '2026-10-29T14:00'],
      ['Daily', '2026-10-30T12:30'],
    ])
  })

  it('dia inteiro: o fim exclusivo do .ics vira o último dia inclusive', () => {
    const [oneDay, trip] = expandIcs(
      calendar(
        vevent(
          'UID:f',
          'SUMMARY:Feriado',
          'DTSTART;VALUE=DATE:20261102',
          'DTEND;VALUE=DATE:20261103',
        ),
        vevent(
          'UID:v',
          'SUMMARY:Viagem',
          'DTSTART;VALUE=DATE:20261026',
          'DTEND;VALUE=DATE:20261029',
        ),
      ),
      from,
      new Date('2026-11-03T00:00:00Z'),
    )
    expect(oneDay).toMatchObject({ allDay: true, date: '2026-11-02', endDate: null })
    expect(trip).toMatchObject({ allDay: true, date: '2026-10-26', endDate: '2026-10-28' })
  })

  it('ignora cancelados e o que está fora do intervalo', () => {
    const events = expandIcs(
      calendar(
        vevent('UID:c', 'SUMMARY:Cancelada', 'STATUS:CANCELLED', 'DTSTART:20261027T150000Z'),
        vevent('UID:o', 'SUMMARY:Antiga', 'DTSTART:20250101T150000Z'),
        vevent('UID:k', 'DTSTART:20261028T150000Z'),
      ),
      from,
      to,
    )
    expect(events.map((e) => e.title)).toEqual(['(sem título)'])
  })

  it('recusa o que não é agenda', () => {
    expect(() => expandIcs('<html>login</html>', from, to)).toThrow()
    expect(() => expandIcs('BEGIN:VCARD\r\nEND:VCARD', from, to)).toThrow()
  })
})
