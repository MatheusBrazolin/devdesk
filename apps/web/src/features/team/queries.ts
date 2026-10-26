import type { Team } from '@devdesk/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** A API guarda o time por 5 minutos; aqui, o mesmo. */
export const teamQuery = queryOptions({
  queryKey: ['team'],
  queryFn: () => api<Team>('/team'),
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
  retry: false,
})
