import type { Standup } from '@devdesk/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const standupQuery = (from: Date, to: Date) =>
  queryOptions({
    queryKey: ['standup', from.toISOString(), to.toISOString()],
    queryFn: () =>
      api<Standup>(
        `/standup?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      ),
    staleTime: 60_000,
  })
