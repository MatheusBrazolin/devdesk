import type { Dashboard } from '@devdesk/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** De quanto em quanto tempo o painel pergunta se chegou PR ou issue novo. */
export const POLL_VISIBLE_MS = 30_000
/** Com a aba escondida, mais devagar: só para os avisos do sistema chegarem. */
export const POLL_HIDDEN_MS = 2 * 60_000

export function pollInterval(stale: boolean | undefined, visible: boolean): number {
  // Resposta "stale" é o retrato guardado: o novo chega em ~2 s, então pergunta logo de novo.
  if (stale) return 3_000
  return visible ? POLL_VISIBLE_MS : POLL_HIDDEN_MS
}

export const dashboardQuery = queryOptions({
  queryKey: ['dashboard'],
  queryFn: () => api<Dashboard>('/dashboard'),
  staleTime: 20_000,
  // Voltar para a aba busca na hora, sem esperar a próxima rodada.
  refetchOnWindowFocus: true,
  refetchIntervalInBackground: true,
  refetchInterval: (query) =>
    pollInterval(query.state.data?.stale, document.visibilityState === 'visible'),
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
