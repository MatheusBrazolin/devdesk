import type { CalendarEvent, ExternalEvent } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { calendarQuery, externalEventsQuery } from './queries'

/** Evento no calendário: seu, do DevDesk, ou de uma agenda assinada (só leitura). */
export type AgendaEvent = CalendarEvent & {
  external?: { calendar: string; location: string | null }
}

export const isExternal = (event: AgendaEvent) => event.external !== undefined

/** Mesma forma dos eventos do DevDesk: agenda, grade e painéis tratam os dois igual. */
export function toAgendaEvent(event: ExternalEvent): AgendaEvent {
  const { calendarId: _, calendar, location, ...rest } = event
  return {
    ...rest,
    description: '',
    kind: 'event',
    link: null,
    createdAt: '',
    updatedAt: '',
    external: { calendar, location },
  }
}

/**
 * Eventos do DevDesk mais os das agendas assinadas. Os do DevDesk chegam na
 * hora; os de fora entram quando a agenda responder, sem segurar a tela.
 */
export function useCalendarEvents(range: { from: string; to: string }) {
  const own = useQuery(calendarQuery(range))
  const external = useQuery(externalEventsQuery(range))
  const data = useMemo(
    () =>
      own.data && {
        events: [
          ...own.data.events,
          ...(external.data?.events ?? []).map(toAgendaEvent),
        ] as AgendaEvent[],
      },
    [own.data, external.data],
  )
  return { data, isError: own.isError, unavailable: external.data?.unavailable ?? [] }
}
