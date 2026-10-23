import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { CalendarDays, CircleDot, GitPullRequest, NotebookPen } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/features/auth/login-page'
import { meQuery } from '@/features/auth/queries'
import { ComingSoonPage } from '@/features/home/coming-soon-page'
import { HomePage } from '@/features/home/home-page'
import { isUnauthenticated } from '@/lib/api'

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { erro?: string } =>
    typeof search.erro === 'string' ? { erro: search.erro } : {},
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery).catch(() => null)
    if (me) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

/** Rota sem caminho que protege tudo abaixo dela. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(meQuery)
    } catch (error) {
      if (isUnauthenticated(error)) throw redirect({ to: '/login' })
      throw error
    }
  },
  component: AppShell,
})

const homeRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: HomePage })

const comingSoon = <TPath extends string>(
  path: TPath,
  props: Parameters<typeof ComingSoonPage>[0],
) =>
  createRoute({
    getParentRoute: () => appRoute,
    path,
    component: () => <ComingSoonPage {...props} />,
  })

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    homeRoute,
    comingSoon('/pull-requests', {
      title: 'Pull requests',
      icon: GitPullRequest,
      stage: 'Fase 2',
      description:
        'Seus PRs e os que pedem a sua review, com status do CI, aprovações e conflitos.',
    }),
    comingSoon('/issues', {
      title: 'Issues',
      icon: CircleDot,
      stage: 'Fase 2',
      description: 'As issues atribuídas a você, agrupadas por repositório e prioridade.',
    }),
    comingSoon('/notas', {
      title: 'Notas',
      icon: NotebookPen,
      stage: 'Fase 3',
      description: 'Notas em markdown, com tags e vínculo direto com PRs e issues.',
    }),
    comingSoon('/calendario', {
      title: 'Calendário',
      icon: CalendarDays,
      stage: 'Fase 4',
      description: 'Eventos, lembretes e os prazos das suas milestones num calendário só.',
    }),
  ]),
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
