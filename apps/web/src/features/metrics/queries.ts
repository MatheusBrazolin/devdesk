import type { Metrics } from '@devdesk/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Semanas passadas quase não mudam: a API guarda 10 min, e aqui também. */
export const metricsQuery = queryOptions({
  queryKey: ['metrics'],
  queryFn: () => api<Metrics>('/metrics'),
  staleTime: 10 * 60_000,
  retry: false,
})
