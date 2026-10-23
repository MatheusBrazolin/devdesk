import type { MeResponse, PublicConfig } from '@devdesk/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/lib/api'

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => api<MeResponse>('/me'),
  staleTime: 5 * 60 * 1000,
  retry: false,
})

export const configQuery = queryOptions({
  queryKey: ['config'],
  queryFn: () => api<PublicConfig>('/config'),
  staleTime: Infinity,
})

/** O login do GitHub é um redirecionamento de página inteira, não um fetch. */
export const GITHUB_LOGIN_URL = '/api/auth/github'

export function useDemoLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api<MeResponse>('/auth/demo', { method: 'POST' }),
    onSuccess: async (me) => {
      queryClient.setQueryData(meQuery.queryKey, me)
      await navigate({ to: '/' })
    },
  })
}

/** Modo pessoal: entra como o dono do token configurado na API. */
export function usePersonalLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () =>
      api<MeResponse>('/auth/personal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    onSuccess: async (me) => {
      queryClient.setQueryData(meQuery.queryKey, me)
      await navigate({ to: '/' })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: async () => {
      queryClient.clear()
      await navigate({ to: '/login' })
    },
  })
}
