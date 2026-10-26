import type {
  CalendarEvent,
  CalendarResponse,
  CreateEventInput,
  CreateSubscriptionInput,
  DeadlinesResponse,
  ExternalEventsResponse,
  Subscription,
  SubscriptionsResponse,
} from '@devdesk/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const json = { 'content-type': 'application/json' }

export const calendarQuery = (range: { from: string; to: string }) =>
  queryOptions({
    queryKey: ['calendar', range],
    queryFn: () => api<CalendarResponse>(`/calendar?from=${range.from}&to=${range.to}`),
    staleTime: 30_000,
  })

/** Prazos vêm do GitHub: consulta à parte, para não segurar os eventos. */
export const deadlinesQuery = (range: { from: string; to: string }) =>
  queryOptions({
    queryKey: ['calendar', 'deadlines', range],
    queryFn: () => api<DeadlinesResponse>(`/calendar/deadlines?from=${range.from}&to=${range.to}`),
    staleTime: 60_000,
  })

/** Agendas assinadas (Google, Outlook, iCloud): vêm de fora, então ficam em consulta à parte. */
export const externalEventsQuery = (range: { from: string; to: string }) =>
  queryOptions({
    queryKey: ['calendar', 'external', range],
    queryFn: () =>
      api<ExternalEventsResponse>(`/calendar/external?from=${range.from}&to=${range.to}`),
    staleTime: 5 * 60_000,
  })

export const subscriptionsQuery = queryOptions({
  queryKey: ['calendar', 'subscriptions'],
  queryFn: () => api<SubscriptionsResponse>('/calendar/subscriptions'),
  staleTime: 5 * 60_000,
})

export function useAddSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) =>
      api<{ subscription: Subscription }>('/calendar/subscriptions', {
        method: 'POST',
        headers: json,
        body: JSON.stringify(input),
      }).then((r) => r.subscription),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

export function useRemoveSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/calendar/subscriptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

/** O .ics é um download de página: o cookie de sessão vai junto. */
export const ICS_URL = '/api/calendar.ics'

export function useSaveEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CreateEventInput }) =>
      api<{ event: CalendarEvent }>(id ? `/calendar/events/${id}` : '/calendar/events', {
        method: id ? 'PUT' : 'POST',
        headers: json,
        body: JSON.stringify(input),
      }).then((r) => r.event),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/calendar/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  })
}
