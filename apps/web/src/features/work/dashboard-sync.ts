import type { Dashboard } from '@devdesk/shared'
import { hashKey, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { meQuery } from '@/features/auth/queries'
import { dashboardQuery } from './queries'

/**
 * Mantém todas as abas e janelas do DevDesk com o mesmo painel. Quando uma
 * busca dados mais novos (no tempo dela ou porque alguém clicou em
 * atualizar), as outras recebem na hora: atualizar a janela principal já
 * atualiza o modo TV aberto ao lado.
 */

const CHANNEL = 'devdesk:painel'
const DASHBOARD_HASH = hashKey(dashboardQuery.queryKey)

interface Message {
  /** De quem é o painel: abas de contas diferentes não se misturam. */
  userId: string
  dashboard: Dashboard
}

/** Vale o que foi buscado no GitHub depois do que a aba já tem. */
export function isNewer(incoming: Dashboard, current: Dashboard | undefined): boolean {
  return !current || Date.parse(incoming.fetchedAt) > Date.parse(current.fetchedAt)
}

export function useDashboardSync(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(CHANNEL)
    const userId = () => queryClient.getQueryData(meQuery.queryKey)?.user.id
    // O último retrato enviado ou recebido: evita mandar de volta o que chegou.
    let last = ''

    channel.onmessage = (event: MessageEvent<Message>) => {
      const { userId: from, dashboard } = event.data
      if (from !== userId()) return
      if (!isNewer(dashboard, queryClient.getQueryData(dashboardQuery.queryKey))) return
      last = dashboard.fetchedAt
      queryClient.setQueryData(dashboardQuery.queryKey, dashboard)
    }

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.query.queryHash !== DASHBOARD_HASH) return
      const dashboard = event.query.state.data as Dashboard | undefined
      const from = userId()
      // O retrato guardado (stale) é velho por definição: não vale espalhar.
      if (!dashboard || !from || dashboard.stale || dashboard.fetchedAt === last) return
      last = dashboard.fetchedAt
      channel.postMessage({ userId: from, dashboard } satisfies Message)
    })

    return () => {
      unsubscribe()
      channel.close()
    }
  }, [queryClient])
}
