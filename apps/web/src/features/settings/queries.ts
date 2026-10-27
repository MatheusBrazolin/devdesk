import type { GitHubHealth, GitHubTokenStatus, NoticeKind, Settings } from '@devdesk/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

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

export const githubTokenQuery = queryOptions({
  queryKey: ['github-token'],
  queryFn: () => api<GitHubTokenStatus>('/github/token'),
  staleTime: Infinity,
})

/** Saúde do acesso: o servidor guarda por dez minutos, aqui vale o mesmo. */
export const githubHealthQuery = queryOptions({
  queryKey: ['github-health'],
  queryFn: () => api<{ health: GitHubHealth | null }>('/github/health').then((r) => r.health),
  staleTime: 10 * 60 * 1000,
})

/** Guarda (texto) ou remove (null) o token pessoal; os dados do GitHub vêm de novo. */
export function useSaveGitHubToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string | null) =>
      token === null
        ? api<GitHubTokenStatus>('/github/token', { method: 'DELETE' })
        : api<GitHubTokenStatus>('/github/token', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token }),
          }),
    onSuccess: (status) => {
      queryClient.setQueryData(githubTokenQuery.queryKey, status)
      for (const key of ['dashboard', 'team', 'metrics', 'standup', 'calendar', 'github-health'])
        void queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
}

/** Token classic com os escopos que o painel precisa, já marcados. */
export const NEW_TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo,read:org&description=DevDesk%20(somente%20leitura)'

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
  review_requested: { title: t('Review pedida'), hint: t('alguém pediu a sua review') },
  overdue_review: { title: t('Review atrasada'), hint: t('pedida a você há mais de 24 h') },
  changes_requested: { title: t('Mudanças pedidas'), hint: t('num PR seu') },
  ci_failed: { title: t('CI falhou'), hint: t('num PR seu') },
  conflict: { title: t('Conflito'), hint: t('num PR seu, com a branch de destino') },
  ready_to_merge: { title: t('Pronto para merge'), hint: t('aprovado e com CI verde') },
  agenda: {
    title: t('Lembretes e reuniões'),
    hint: t('na hora dos lembretes e antes das reuniões'),
  },
}

/** Ligado até as configurações carregarem: melhor um aviso a mais que um perdido. */
export function noticeEnabled(settings: Settings | undefined, kind: NoticeKind): boolean {
  return settings?.notifications[kind] ?? true
}
