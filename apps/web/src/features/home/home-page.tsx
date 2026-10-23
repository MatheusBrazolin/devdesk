import type { Dashboard, PullRequest } from '@devdesk/shared'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BarList } from '@/components/charts/bar-list'
import { ChartTooltipProvider } from '@/components/charts/chart-tooltip'
import { ColumnChart } from '@/components/charts/column-chart'
import { StatTile, statTileClass } from '@/components/charts/stat-tile'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { dateKey, fromKey } from '@/lib/calendar-dates'
import { ageBuckets, loadByOwner, mergedPerDay } from './dashboard-metrics'
import { Link } from '@tanstack/react-router'
import { CircleCheck, MessageSquareText } from 'lucide-react'
import { motion } from 'motion/react'
import { buttonVariants } from '@/components/ui/button-variants'
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

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: 'easeOut' as const },
})

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const longDay = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function HomePage() {
  const { user } = useSuspenseQuery(meQuery).data
  const dashboard = useQuery(dashboardQuery)
  const now = new Date()
  const today = dateKey(now)
  const data = dashboard.data

  const merged = data ? mergedPerDay(data.pullRequests.merged, today) : null
  const authored = data?.pullRequests.authored ?? []
  const staleCount = authored.filter((pr) => !pr.isDraft && isStale(pr)).length

  return (
    <ChartTooltipProvider>
      <div className="space-y-5">
        <motion.header {...fadeUp(0)} className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              {greetingFor(now)}, {firstName(user.name, user.login)}
            </h1>
            <p className="mt-0.5 text-[13px] text-fg-muted first-letter:uppercase">
              {formatLongDate(now)}
              {data && <> · {attentionSummary(data.attention.length, staleCount)}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <Link to="/standup" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <MessageSquareText /> Standup
            </Link>
          </div>
        </motion.header>

        <motion.section
          {...fadeUp(0.04)}
          aria-label="Indicadores"
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        >
          <Link
            {...({ to: '/pull-requests', search: { aba: 'review' } } as const)}
            className={statTileClass}
          >
            <StatTile
              label="Reviews pedidas"
              value={data?.summary.reviewRequested ?? null}
              hint="aguardando você"
              tone="attention"
            />
          </Link>
          <Link
            {...({ to: '/pull-requests', search: { aba: 'meus' } } as const)}
            className={statTileClass}
          >
            <StatTile
              label="Seus PRs abertos"
              value={data?.summary.openPullRequests ?? null}
              hint={
                data ? (staleCount ? `${staleCount} parados há +7 dias` : 'nenhum parado') : ' '
              }
            />
          </Link>
          <Link {...({ to: '/issues' } as const)} className={statTileClass}>
            <StatTile
              label="Issues atribuídas"
              value={data?.summary.assignedIssues ?? null}
              hint="abertas e com você"
            />
          </Link>
          <Link
            {...({ to: '/pull-requests', search: { aba: 'mergeados' } } as const)}
            className={statTileClass}
          >
            <StatTile
              label="Mergeados"
              value={data?.summary.mergedThisWeek ?? null}
              hint="últimos 7 dias"
              trend={merged?.map((day) => day.count)}
            />
          </Link>
        </motion.section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <motion.div {...fadeUp(0.08)}>
            <AttentionCard dashboard={dashboard} />
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <WeekAgendaCard />
          </motion.div>
        </div>

        {data && (
          <motion.section
            {...fadeUp(0.12)}
            aria-label="Gráficos"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <ChartCard
              title="Mergeados por dia"
              subtitle={plural(
                merged!.reduce((sum, d) => sum + d.count, 0),
                'PR nos últimos 7 dias',
                'PRs nos últimos 7 dias',
              )}
            >
              <ColumnChart
                columns={merged!.map(({ day, count }) => ({
                  key: day,
                  label: day === today ? 'hoje' : weekday.format(fromKey(day)).replace('.', ''),
                  fullLabel: day === today ? 'hoje' : longDay.format(fromKey(day)),
                  value: count,
                }))}
                highlightKey={today}
                unit={(n) => plural(n, 'PR mergeado', 'PRs mergeados')}
              />
            </ChartCard>

            <ChartCard
              title="Idade dos seus PRs abertos"
              subtitle="tempo sem atividade; em destaque, os parados"
            >
              {authored.length === 0 ? (
                <p className="text-[13px] text-fg-subtle">Nenhum PR aberto.</p>
              ) : (
                <BarList
                  tone="muted"
                  rows={ageBuckets(authored, now).map((bucket) => ({
                    key: bucket.label,
                    label: bucket.label,
                    labelText: bucket.stale ? `${bucket.label} (parados)` : bucket.label,
                    value: bucket.count,
                    emphasis: bucket.stale && bucket.count > 0,
                  }))}
                  unit={(n) => plural(n, 'PR', 'PRs')}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Abertos por organização"
              subtitle="seus PRs abertos e issues atribuídas"
              className="md:col-span-2 xl:col-span-1"
            >
              {loadByOwner(authored, data.issues).length === 0 ? (
                <p className="text-[13px] text-fg-subtle">Nada aberto.</p>
              ) : (
                <BarList
                  rows={loadByOwner(authored, data.issues)
                    .slice(0, 6)
                    .map((load) => ({
                      key: load.owner,
                      label: (
                        <>
                          <OwnerAvatar owner={load.owner} />
                          <span className="truncate">{load.owner}</span>
                        </>
                      ),
                      labelText: `${load.owner}: ${plural(load.pullRequests, 'PR', 'PRs')} e ${plural(load.issues, 'issue', 'issues')}`,
                      value: load.pullRequests + load.issues,
                    }))}
                  unit={(n) => plural(n, 'item aberto', 'itens abertos')}
                />
              )}
            </ChartCard>
          </motion.section>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <motion.div {...fadeUp(0.14)}>
            {data && <StalePanel pullRequests={authored} />}
          </motion.div>
          <motion.div {...fadeUp(0.16)}>
            <PinnedNotesCard />
          </motion.div>
        </div>
      </div>
    </ChartTooltipProvider>
  )
}

function attentionSummary(attention: number, stale: number): string {
  if (attention === 0 && stale === 0) return 'nada esperando por você'
  const parts = [
    attention > 0 && plural(attention, 'item pede sua atenção', 'itens pedem sua atenção'),
    stale > 0 && plural(stale, 'PR parado', 'PRs parados'),
  ]
  return parts.filter(Boolean).join(' · ')
}

function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string
  subtitle: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="h-auto flex-col items-start gap-0.5 border-b-0 pt-4 pb-0">
        <CardTitle>{title}</CardTitle>
        <p className="text-[12px] text-fg-subtle">{subtitle}</p>
      </CardHeader>
      <div className="flex-1 px-4 pt-4 pb-4">{children}</div>
    </Card>
  )
}

function AttentionCard({ dashboard }: { dashboard: ReturnType<typeof useQuery<Dashboard>> }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Precisa da sua atenção</CardTitle>
        {dashboard.data && (
          <span className="font-mono text-[11px] text-fg-subtle">
            {plural(dashboard.data.attention.length, 'item', 'itens')}
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
