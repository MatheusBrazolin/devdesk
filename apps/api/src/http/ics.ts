import { addDays, type CalendarEvent } from '../domain/calendar-event.js'
import type { Deadline } from '../domain/deadlines.js'

/**
 * Gera um arquivo iCalendar (RFC 5545) que Google Agenda, Apple Calendar e
 * Outlook importam. Função pura: recebe tudo e devolve o texto.
 */

const CRLF = '\r\n'
const MAX_LINE_OCTETS = 75

/** Texto escapado conforme a RFC: barra, ponto e vírgula, vírgula e quebras de linha. */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Dobra linhas longas em pedaços de até 75 bytes, sem cortar um caractere UTF-8 no meio. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1 // a continuação começa com espaço
    if (size + bytes > limit) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

const compactDate = (date: string) => date.replaceAll('-', '')
const utcStamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

const DEFAULT_EVENT_MINUTES = 30

function eventLines(event: CalendarEvent, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@devdesk`,
    `DTSTAMP:${stamp}`,
    `LAST-MODIFIED:${utcStamp(event.updatedAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ]
  if (event.allDay) {
    // Em dia inteiro, DTEND é o dia seguinte ao último (exclusivo).
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`)
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(event.endDate ?? event.date, 1))}`)
  } else {
    const end = event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_EVENT_MINUTES * 60_000)
    lines.push(`DTSTART:${utcStamp(event.startsAt)}`)
    lines.push(`DTEND:${utcStamp(end)}`)
  }
  const description = [
    event.description,
    event.link && `${event.link.repository}#${event.link.number}`,
  ]
    .filter(Boolean)
    .join('\n\n')
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
  if (event.link) lines.push(`URL:${event.link.url}`)
  if (event.kind === 'reminder') {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(event.title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
    )
  }
  lines.push('END:VEVENT')
  return lines
}

function deadlineLines(deadline: Deadline, stamp: string): string[] {
  const id = Buffer.from(deadline.url).toString('base64url')
  return [
    'BEGIN:VEVENT',
    `UID:deadline-${id}@devdesk`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escapeText(`Prazo: ${deadline.title} (${deadline.repository})`)}`,
    `DTSTART;VALUE=DATE:${compactDate(deadline.date)}`,
    `DTEND;VALUE=DATE:${compactDate(addDays(deadline.date, 1))}`,
    `DESCRIPTION:${escapeText(`Milestone do GitHub com ${deadline.items} ${deadline.items === 1 ? 'item seu' : 'itens seus'}.`)}`,
    `URL:${deadline.url}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ]
}

export function buildIcs(events: CalendarEvent[], deadlines: Deadline[], now: Date): string {
  const stamp = utcStamp(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DevDesk//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:DevDesk',
    ...events.flatMap((event) => eventLines(event, stamp)),
    ...deadlines.flatMap((deadline) => deadlineLines(deadline, stamp)),
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join(CRLF) + CRLF
}
