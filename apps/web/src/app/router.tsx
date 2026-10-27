import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { NotFound, RouteError } from '@/app/route-states'
import { AppShell } from '@/components/layout/app-shell'
import { isTvLayoutChoice, type TvLayoutChoice } from '@/features/tv/tv-scale'
import { LoginPage } from '@/features/auth/login-page'
import { meQuery } from '@/features/auth/queries'
import { HomePage } from '@/features/home/home-page'
import { type ListSearch, parseListSearch } from '@/features/work/list-search'
import type { PullRequestTab } from '@/features/work/pull-requests-page'
import { isUnauthenticated } from '@/lib/api'
import { dateKey, fromKey } from '@/lib/calendar-dates'

/**
 * O Hoje e o login vão no arquivo principal: são a primeira tela. As outras
 * páginas são carregadas quando abertas (o editor de markdown das notas, por
 * exemplo, não pesa em quem só olha o painel).
 */
const lazy = {
  focus: lazyRouteComponent(() => import('@/features/focus/focus-page'), 'FocusPage'),
  tv: lazyRouteComponent(() => import('@/features/tv/tv-page'), 'TvPage'),
  pullRequests: lazyRouteComponent(
    () => import('@/features/work/pull-requests-page'),
    'PullRequestsPage',
  ),
  issues: lazyRouteComponent(() => import('@/features/work/issues-page'), 'IssuesPage'),
  notes: lazyRouteComponent(() => import('@/features/notes/notes-page'), 'NotesPage'),
  calendar: lazyRouteComponent(() => import('@/features/calendar/calendar-page'), 'CalendarPage'),
  standup: lazyRouteComponent(() => import('@/features/standup/standup-page'), 'StandupPage'),
  week: lazyRouteComponent(() => import('@/features/week/week-page'), 'WeekPage'),
  metrics: lazyRouteComponent(() => import('@/features/metrics/metrics-page'), 'MetricsPage'),
  team: lazyRouteComponent(() => import('@/features/team/team-page'), 'TeamPage'),
  settings: lazyRouteComponent(() => import('@/features/settings/settings-page'), 'SettingsPage'),
  privacy: lazyRouteComponent(() => import('@/features/privacy/privacy-page'), 'PrivacyPage'),
}

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

/** Pública: dá para ler antes de entrar. */
const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacidade',
  component: lazy.privacy,
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
const tvRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tv',
  // ?layout=coluna fixa o arranjo; sem ele, segue o formato da janela.
  validateSearch: (search: Record<string, unknown>): { layout?: TvLayoutChoice } =>
    isTvLayoutChoice(search.layout) && search.layout !== 'auto' ? { layout: search.layout } : {},
  component: lazy.tv,
})
const metricsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/metricas',
  component: lazy.metrics,
})
const teamRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/time',
  component: lazy.team,
})
const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/configuracoes',
  component: lazy.settings,
})
const focusRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foco',
  component: lazy.focus,
})

const PR_TABS: PullRequestTab[] = ['review', 'meus', 'mergeados']

const pullRequestsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/pull-requests',
  validateSearch: (search: Record<string, unknown>): ListSearch & { aba: PullRequestTab } => ({
    aba: PR_TABS.find((tab) => tab === search.aba) ?? 'review',
    ...parseListSearch(search),
  }),
  component: lazy.pullRequests,
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
  component: lazy.notes,
})

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/calendario',
  validateSearch: (search: Record<string, unknown>): { mes?: string } => ({
    mes: text(search.mes),
  }),
  component: lazy.calendar,
})

const standupRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/standup',
  validateSearch: (search: Record<string, unknown>): { dia?: string } => {
    const dia = text(search.dia)
    // Só datas que existem: "2026-13-45" viraria outra data em silêncio.
    return {
      dia:
        dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) && dateKey(fromKey(dia)) === dia ? dia : undefined,
    }
  },
  component: lazy.standup,
})

const weekRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/semana',
  validateSearch: (search: Record<string, unknown>): { semana?: string } => {
    const semana = text(search.semana)
    return {
      semana:
        semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) && dateKey(fromKey(semana)) === semana
          ? semana
          : undefined,
    }
  },
  component: lazy.week,
})

const issuesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/issues',
  validateSearch: (search: Record<string, unknown>): Omit<ListSearch, 'ordem'> => {
    const { q, org } = parseListSearch(search)
    return { q, org }
  },
  component: lazy.issues,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  privacyRoute,
  appRoute.addChildren([
    homeRoute,
    focusRoute,
    metricsRoute,
    teamRoute,
    settingsRoute,
    tvRoute,
    pullRequestsRoute,
    issuesRoute,
    notesRoute,
    calendarRoute,
    standupRoute,
    weekRoute,
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
