import ICAL from 'ical.js'
import type { ExternalOccurrence } from '../../domain/external-calendar.js'

/** Teto de voltas por série: uma diária desde 2015 ainda cabe; uma série sem fim não trava a API. */
const MAX_STEPS_PER_SERIES = 10_000
/** Teto de ocorrências devolvidas por agenda. */
const MAX_OCCURRENCES = 2_000

const DAY_MS = 86_400_000

const toDateKey = (time: ICAL.Time) =>
  `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`

function previousDay(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function occurrence(
  uid: string,
  item: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time | null,
): ExternalOccurrence {
  const base = {
    id: `${uid}@${start.toString()}`,
    title: text(item.summary) ?? '(sem título)',
    location: text(item.location),
  }
  if (start.isDate) {
    // No .ics o fim de um evento de dia inteiro é exclusivo; aqui o último dia conta.
    const first = toDateKey(start)
    const last = end ? previousDay(toDateKey(end)) : first
    return { ...base, allDay: true, date: first, endDate: last > first ? last : null }
  }
  const startsAt = start.toJSDate()
  const endsAt = end?.toJSDate() ?? null
  return {
    ...base,
    allDay: false,
    startsAt,
    endsAt: endsAt && endsAt > startsAt ? endsAt : null,
  }
}

function overlaps(event: ExternalOccurrence, from: Date, to: Date): boolean {
  if (event.allDay) {
    const start = Date.parse(`${event.date}T00:00:00Z`)
    const end = Date.parse(`${event.endDate ?? event.date}T00:00:00Z`) + DAY_MS
    return start < to.getTime() && end > from.getTime()
  }
  const end = event.endsAt ?? event.startsAt
  return event.startsAt < to && end >= from
}

const cancelled = (component: ICAL.Component) =>
  String(component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED'

/**
 * Lê um .ics e devolve as ocorrências que tocam [from, to), com as repetições
 * (RRULE), as datas excluídas (EXDATE) e as exceções (RECURRENCE-ID) já aplicadas.
 * Lança se o texto não for uma agenda.
 */
export function expandIcs(source: string, from: Date, to: Date): ExternalOccurrence[] {
  const root = new ICAL.Component(ICAL.parse(source))
  if (root.name !== 'vcalendar') throw new Error('não é uma agenda iCalendar')

  for (const zone of root.getAllSubcomponents('vtimezone')) {
    ICAL.TimezoneService.register(zone)
  }

  // Exceções chegam como VEVENTs à parte, com o mesmo UID e um RECURRENCE-ID.
  const masters = new Map<string, ICAL.Component>()
  const exceptions = new Map<string, ICAL.Component[]>()
  for (const component of root.getAllSubcomponents('vevent')) {
    const uid = text(component.getFirstPropertyValue('uid')) ?? `sem-uid-${masters.size}`
    if (component.hasProperty('recurrence-id')) {
      exceptions.set(uid, [...(exceptions.get(uid) ?? []), component])
    } else {
      masters.set(uid, component)
    }
  }

  const result: ExternalOccurrence[] = []
  const push = (event: ExternalOccurrence) => {
    if (result.length < MAX_OCCURRENCES && overlaps(event, from, to)) result.push(event)
  }

  for (const [uid, component] of masters) {
    if (cancelled(component) || !component.hasProperty('dtstart')) continue
    const event = new ICAL.Event(component)
    for (const exception of exceptions.get(uid) ?? []) event.relateException(exception)

    if (!event.isRecurring()) {
      push(occurrence(uid, event, event.startDate, event.endDate ?? null))
      continue
    }

    const iterator = event.iterator()
    for (let step = 0, next = iterator.next(); next && step < MAX_STEPS_PER_SERIES; step++) {
      if (next.toJSDate() >= to) break
      const details = event.getOccurrenceDetails(next)
      if (!cancelled(details.item.component)) {
        push(occurrence(uid, details.item, details.startDate, details.endDate ?? null))
      }
      next = iterator.next()
    }
  }

  // Exceção sem a série (o .ics só trouxe a ocorrência alterada) também aparece.
  for (const [uid, list] of exceptions) {
    if (masters.has(uid)) continue
    for (const component of list) {
      if (cancelled(component) || !component.hasProperty('dtstart')) continue
      const event = new ICAL.Event(component)
      push(occurrence(uid, event, event.startDate, event.endDate ?? null))
    }
  }

  return result
}
