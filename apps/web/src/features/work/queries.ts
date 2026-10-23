import type { Dashboard } from '@devdesk/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const dashboardQuery = queryOptions({
  queryKey: ['dashboard'],
  queryFn: () => api<Dashboard>('/dashboard'),
  staleTime: 60_000,
  refetchInterval: 2 * 60_000,
  retry: false,
})

/** Busca de novo no GitHub, ignorando o cache da API. */
export function useRefreshDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<Dashboard>('/dashboard?refresh=true'),
    onSuccess: (dashboard) => queryClient.setQueryData(dashboardQuery.queryKey, dashboard),
  })
}
