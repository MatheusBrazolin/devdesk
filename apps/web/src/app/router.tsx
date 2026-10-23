import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { NotFound, RouteError } from '@/app/route-states'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/features/auth/login-page'
import { meQuery } from '@/features/auth/queries'
import { CalendarPage } from '@/features/calendar/calendar-page'
import { NotesPage } from '@/features/notes/notes-page'
import { StandupPage } from '@/features/standup/standup-page'
import { HomePage } from '@/features/home/home-page'
import { IssuesPage } from '@/features/work/issues-page'
import { type ListSearch, parseListSearch } from '@/features/work/list-search'
import { type PullRequestTab, PullRequestsPage } from '@/features/work/pull-requests-page'
import { isUnauthenticated } from '@/lib/api'

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
})

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

const PR_TABS: PullRequestTab[] = ['review', 'meus', 'mergeados']

const pullRequestsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/pull-requests',
  validateSearch: (search: Record<string, unknown>): ListSearch & { aba: PullRequestTab } => ({
    aba: PR_TABS.find((tab) => tab === search.aba) ?? 'review',
    ...parseListSearch(search),
  }),
  component: PullRequestsPage,
})

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

const notesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/notas',
  validateSearch: (
    search: Record<string, unknown>,
  ): { nota?: string; q?: string; tag?: string } => ({
    nota: text(search.nota),
    q: text(search.q),
    tag: text(search.tag),
  }),
  component: NotesPage,
})

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/calendario',
  validateSearch: (search: Record<string, unknown>): { mes?: string } => ({
    mes: text(search.mes),
  }),
  component: CalendarPage,
})

const standupRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/standup',
  validateSearch: (search: Record<string, unknown>): { dia?: string } => {
    const dia = text(search.dia)
    return { dia: dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined }
  },
  component: StandupPage,
})

const issuesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/issues',
  validateSearch: (search: Record<string, unknown>): Omit<ListSearch, 'ordem'> => {
    const { q, org } = parseListSearch(search)
    return { q, org }
  },
  component: IssuesPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    homeRoute,
    pullRequestsRoute,
    issuesRoute,
    notesRoute,
    calendarRoute,
    standupRoute,
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
