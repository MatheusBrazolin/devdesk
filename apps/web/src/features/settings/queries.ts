import type { NoticeKind, Settings } from '@devdesk/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const settingsQuery = queryOptions({
  queryKey: ['settings'],
  queryFn: () => api<{ settings: Settings }>('/settings').then((r) => r.settings),
  staleTime: Infinity,
})

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    // A caixa muda na hora; se o servidor recusar, volta ao que era.
    onMutate: async (settings: Settings) => {
      await queryClient.cancelQueries({ queryKey: settingsQuery.queryKey })
      const previous = queryClient.getQueryData(settingsQuery.queryKey)
      queryClient.setQueryData(settingsQuery.queryKey, settings)
      return { previous }
    },
    onError: (_error, _settings, context) =>
      queryClient.setQueryData(settingsQuery.queryKey, context?.previous),
    mutationFn: (settings: Settings) =>
      api<{ settings: Settings }>('/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      }).then((r) => r.settings),
    onSuccess: (settings) => {
      // A resposta é a versão normalizada (sem repetidos; lista vazia vira automático).
      queryClient.setQueryData(settingsQuery.queryKey, settings)
      // O time depende dos repositórios escolhidos.
      void queryClient.invalidateQueries({ queryKey: ['team'] })
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirmation: string) =>
      api<void>('/me', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      }),
  })
}

/** Download de página: o cookie de sessão vai junto. */
export const EXPORT_URL = '/api/me/export'

export const NOTICE_LABELS: Record<NoticeKind, { title: string; hint: string }> = {
  review_requested: { title: 'Review pedida', hint: 'alguém pediu a sua review' },
  overdue_review: { title: 'Review atrasada', hint: 'pedida a você há mais de 24 h' },
  changes_requested: { title: 'Mudanças pedidas', hint: 'num PR seu' },
  ci_failed: { title: 'CI falhou', hint: 'num PR seu' },
  conflict: { title: 'Conflito', hint: 'num PR seu, com a branch de destino' },
  ready_to_merge: { title: 'Pronto para merge', hint: 'aprovado e com CI verde' },
  agenda: { title: 'Lembretes e reuniões', hint: 'na hora dos lembretes e antes das reuniões' },
}

/** Ligado até as configurações carregarem: melhor um aviso a mais que um perdido. */
export function noticeEnabled(settings: Settings | undefined, kind: NoticeKind): boolean {
  return settings?.notifications[kind] ?? true
}
