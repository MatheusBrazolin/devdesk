import type { CalendarEvent } from '@devdesk/shared'
import { dateKey } from '@/lib/calendar-dates'
import { DURATIONS, type Minutes } from './focus-timer'

type Timed = CalendarEvent & { allDay: false }

export type FocusWindow =
  /** Numa reunião agora. */
  | { kind: 'busy'; event: Timed; endsAt: number }
  /** Livre até a próxima reunião de hoje; sem ela, minutes é nulo. */
  | { kind: 'free'; minutes: number | null; next: Timed | null; suggestion: Minutes | null }

/** Lembrete é um aviso, não uma reunião: não ocupa a agenda. */
const isMeeting = (event: CalendarEvent): event is Timed => !event.allDay && event.kind === 'event'

/**
 * O tempo livre entre agora e a próxima reunião, e o maior bloco de foco que
 * cabe nele com 5 minutos de folga para chegar à reunião.
 */
export function focusWindow(events: CalendarEvent[], now: number): FocusWindow {
  const meetings = events.filter(isMeeting)
  const current = meetings
    .filter((event) => event.endsAt !== null)
    .filter((event) => Date.parse(event.startsAt) <= now && Date.parse(event.endsAt!) > now)
    .sort((a, b) => Date.parse(b.endsAt!) - Date.parse(a.endsAt!))[0]
  if (current) return { kind: 'busy', event: current, endsAt: Date.parse(current.endsAt!) }

  // Reunião de amanhã não limita o foco de hoje.
  const today = dateKey(new Date(now))
  const next =
    meetings
      .filter((event) => Date.parse(event.startsAt) > now)
      .filter((event) => dateKey(new Date(event.startsAt)) === today)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null
  if (!next) return { kind: 'free', minutes: null, next: null, suggestion: DURATIONS.at(-1)! }

  const minutes = Math.floor((Date.parse(next.startsAt) - now) / 60_000)
  const fits = [...DURATIONS].reverse().find((length) => length + 5 <= minutes) ?? null
  return { kind: 'free', minutes, next, suggestion: fits }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
