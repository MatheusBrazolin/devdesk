import type { Standup } from '@devdesk/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Começa com "standup": trocar o token esquece a semana junto com o standup. */
export const weekQuery = (from: Date, to: Date) =>
  queryOptions({
    queryKey: ['standup', 'week', from.toISOString(), to.toISOString()],
    queryFn: () =>
      api<Standup>(
        `/week?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      ),
    staleTime: 60_000,
  })
