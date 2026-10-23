import type { Dashboard, PullRequest } from '@devdesk/shared'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { meQuery } from '@/features/auth/queries'
import { WeekAgendaCard } from '@/features/calendar/week-agenda-card'
import { PinnedNotesCard } from '@/features/notes/pinned-notes-card'
import { applySort, isStale } from '@/features/work/list-filters'
import { DashboardError, ListSkeleton } from '@/features/work/list-states'
import { PullRequestRow } from '@/features/work/pull-request-row'
import { dashboardQuery } from '@/features/work/queries'
import { SyncStatus } from '@/features/work/sync-status'
import { cn } from '@/lib/cn'
import { firstName, formatLongDate, greetingFor } from '@/lib/greeting'

type SummaryKey = keyof Dashboard['summary']

const SUMMARY: {
  key: SummaryKey
  label: string
  hint: string
  to: '/pull-requests' | '/issues'
  search?: { aba: 'review' | 'meus' | 'mergeados' }
}[] = [
  {
    key: 'reviewRequested',
    label: 'Reviews pedidas',
    hint: 'aguardando você',
    to: '/pull-requests',
    search: { aba: 'review' },
  },
  {
    key: 'openPullRequests',
    label: 'PRs abertos',
    hint: 'de sua autoria',
    to: '/pull-requests',
    search: { aba: 'meus' },
  },
  { key: 'assignedIssues', label: 'Issues', hint: 'atribuídas a você', to: '/issues' },
  {
    key: 'mergedThisWeek',
    label: 'Mergeados',
    hint: 'últimos 7 dias',
    to: '/pull-requests',
    search: { aba: 'mergeados' },
  },
]

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: 'easeOut' as const },
})

export function HomePage() {
  const { user } = useSuspenseQuery(meQuery).data
  const dashboard = useQuery(dashboardQuery)
  const now = new Date()

  return (
    <div className="space-y-6">
      <motion.header {...fadeUp(0)} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {greetingFor(now)}, {firstName(user.name, user.login)}
          </h1>
          <p className="mt-0.5 text-[13px] text-fg-muted first-letter:uppercase">
            {formatLongDate(now)}
          </p>
        </div>
        <SyncStatus />
      </motion.header>

      <motion.dl
        {...fadeUp(0.05)}
        className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-4"
      >
        {SUMMARY.map(({ key, label, hint, to, search }, index) => (
          <Link
            key={key}
            to={to}
            search={search}
            className={cn(
              'border-border px-4 py-3 transition-colors hover:bg-elevated/50',
              index % 2 === 1 && 'border-l',
              index >= 2 && 'border-t md:border-t-0',
              index === 2 && 'md:border-l',
            )}
          >
            <dt className="text-[12px] text-fg-muted">{label}</dt>
            <dd className="mt-1 flex items-baseline gap-2">
              {dashboard.data ? (
                <span className="font-mono text-lg font-medium tabular-nums">
                  {dashboard.data.summary[key]}
                </span>
              ) : (
                <span className="font-mono text-lg text-fg-subtle">—</span>
              )}
              <span className="text-[12px] text-fg-subtle">{hint}</span>
            </dd>
          </Link>
        ))}
      </motion.dl>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <motion.div {...fadeUp(0.1)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Precisa da sua atenção</CardTitle>
              {dashboard.data && (
                <span className="font-mono text-[11px] text-fg-subtle">
                  {dashboard.data.attention.length}{' '}
                  {dashboard.data.attention.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </CardHeader>
            {dashboard.isPending ? (
              <ListSkeleton />
            ) : dashboard.isError ? (
              <DashboardError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
            ) : dashboard.data.attention.length === 0 ? (
              <EmptyState
                icon={CircleCheck}
                title="Nada esperando por você"
                description="Nenhuma review pedida, e seus PRs não têm CI quebrado, conflito ou pedido de mudança."
                className="py-10"
              />
            ) : (
              <ul className="divide-y divide-border">
                {dashboard.data.attention.map(({ reason, pullRequest }) => (
                  <PullRequestRow
                    key={pullRequest.id}
                    pullRequest={pullRequest}
                    reason={reason}
                    showAuthor={reason === 'review_requested'}
                  />
                ))}
              </ul>
            )}
          </Card>

          {dashboard.data && <StalePanel pullRequests={dashboard.data.pullRequests.authored} />}

          {dashboard.data && dashboard.data.pullRequests.merged.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mergeados na semana</CardTitle>
                <Link
                  to="/pull-requests"
                  search={{ aba: 'mergeados' }}
                  className="text-[12px] text-fg-muted hover:text-fg"
                >
                  Ver todos
                </Link>
              </CardHeader>
              <ul className="divide-y divide-border">
                {dashboard.data.pullRequests.merged.slice(0, 3).map((pr) => (
                  <PullRequestRow key={pr.id} pullRequest={pr} showAuthor={false} />
                ))}
              </ul>
            </Card>
          )}
        </motion.div>

        <motion.div {...fadeUp(0.15)} className="space-y-4">
          <WeekAgendaCard />
          <PinnedNotesCard />
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Seus PRs sem movimento há mais de uma semana, os mais antigos primeiro.
 * Não pedem ação sua no código, mas talvez um lembrete a quem revisa.
 */
function StalePanel({ pullRequests }: { pullRequests: PullRequest[] }) {
  const stale = applySort(
    pullRequests.filter((pr) => !pr.isDraft && isStale(pr)),
    'antigos',
  )
  if (stale.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Parados há mais de 7 dias
          <span className="ml-2 font-mono text-[11px] font-normal text-fg-subtle">
            {stale.length}
          </span>
        </CardTitle>
        <Link
          to="/pull-requests"
          search={{ aba: 'meus', ordem: 'antigos' }}
          className="text-[12px] text-fg-muted hover:text-fg"
        >
          Ver todos
        </Link>
      </CardHeader>
      <ul className="divide-y divide-border">
        {stale.slice(0, 3).map((pr) => (
          <PullRequestRow key={pr.id} pullRequest={pr} showAuthor={false} />
        ))}
      </ul>
    </Card>
  )
}
