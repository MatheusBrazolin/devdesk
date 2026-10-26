import type { Dashboard, PullRequest } from '@devdesk/shared'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Building2,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Eye,
  GitMerge,
  GitPullRequest,
  Hourglass,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { BarList } from '@/components/charts/bar-list'
import { ChartTooltipProvider } from '@/components/charts/chart-tooltip'
import { ColumnChart } from '@/components/charts/column-chart'
import { StatTile, statTileClass } from '@/components/charts/stat-tile'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { meQuery } from '@/features/auth/queries'
import { WeekAgendaCard } from '@/features/calendar/week-agenda-card'
import { PinnedNotesCard } from '@/features/notes/pinned-notes-card'
import { applySort, isStale } from '@/features/work/list-filters'
import { DashboardError, ListSkeleton } from '@/features/work/list-states'
import { PullRequestRow } from '@/features/work/pull-request-row'
import { orderAttention } from '@/features/work/review-queue'
import { dashboardQuery } from '@/features/work/queries'
import { SyncStatus } from '@/features/work/sync-status'
import { dateKey, fromKey } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { firstName, formatLongDate, greetingFor } from '@/lib/greeting'
import { fadeUp } from '@/lib/motion'
import { ageBuckets, loadByOwner, mergedPerDay } from './dashboard-metrics'

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const longDay = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Abaixo do xl as listas crescem com a página; aqui elas ganham um teto. */
const LIST_CAP = 'max-xl:max-h-[26rem]'

/**
 * O painel Hoje. A partir do xl ele ocupa exatamente a altura da tela
 * (topo de 3rem + respiro de 3rem): nada para rolar, cada cartão rola por
 * dentro se precisar. Abaixo disso, empilha e a página rola normalmente.
 */
export function HomePage() {
  const { user } = useSuspenseQuery(meQuery).data
  const dashboard = useQuery(dashboardQuery)
  const now = new Date()
  const today = dateKey(now)
  const data = dashboard.data

  const merged = data ? mergedPerDay(data.pullRequests.merged, today) : null
  const authored = data?.pullRequests.authored ?? []
  const staleCount = authored.filter((pr) => !pr.isDraft && isStale(pr)).length
  const owners = data ? loadByOwner(authored, data.issues) : []

  return (
    <ChartTooltipProvider>
      <div className="flex flex-col gap-4 xl:h-[calc(100dvh-6rem)] xl:min-h-[38rem]">
        <motion.header
          {...fadeUp(0)}
          className="flex shrink-0 flex-wrap items-end justify-between gap-3"
        >
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">
              {greetingFor(now)}, {firstName(user.name, user.login)}
            </h1>
            <p className="mt-0.5 text-[13px] text-fg-muted first-letter:uppercase">
              {formatLongDate(now)}
              {data && <> · {attentionSummary(data.attention.length, staleCount)}</>}
            </p>
          </div>
          <SyncStatus />
        </motion.header>

        <section
          aria-label="Indicadores"
          className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <motion.div {...fadeUp(0.03)}>
            <Link
              {...({ to: '/pull-requests', search: { aba: 'review' } } as const)}
              className={statTileClass}
            >
              <StatTile
                label="Reviews pedidas"
                icon={Eye}
                tone="accent"
                alert
                value={data?.summary.reviewRequested ?? null}
                hint="aguardando você"
              />
            </Link>
          </motion.div>
          <motion.div {...fadeUp(0.06)}>
            <Link
              {...({ to: '/pull-requests', search: { aba: 'meus' } } as const)}
              className={statTileClass}
            >
              <StatTile
                label="Seus PRs abertos"
                icon={GitPullRequest}
                tone="success"
                value={data?.summary.openPullRequests ?? null}
                hint={staleCount ? `${staleCount} parados há +7 dias` : 'nenhum parado'}
              />
            </Link>
          </motion.div>
          <motion.div {...fadeUp(0.09)}>
            <Link {...({ to: '/issues' } as const)} className={statTileClass}>
              <StatTile
                label="Issues atribuídas"
                icon={CircleDot}
                tone="info"
                value={data?.summary.assignedIssues ?? null}
                hint="abertas e com você"
              />
            </Link>
          </motion.div>
          <motion.div {...fadeUp(0.12)}>
            <Link
              {...({ to: '/pull-requests', search: { aba: 'mergeados' } } as const)}
              className={statTileClass}
            >
              <StatTile
                label="Mergeados"
                icon={GitMerge}
                tone="merged"
                value={data?.summary.mergedThisWeek ?? null}
                hint="últimos 7 dias"
                trend={merged?.map((day) => day.count)}
              />
            </Link>
          </motion.div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12 xl:grid-rows-2">
          <Panel delay={0.15} className="md:col-span-2 xl:col-span-5 xl:row-start-1">
            <AttentionCard dashboard={dashboard} />
          </Panel>

          <Panel delay={0.18} className="xl:col-span-3 xl:col-start-10 xl:row-start-1">
            <WeekAgendaCard className={cn('h-full', LIST_CAP)} />
          </Panel>

          <motion.section
            {...fadeUp(0.21)}
            aria-label="Gráficos"
            className="grid min-h-0 grid-cols-1 gap-4 md:col-span-2 md:grid-cols-3 xl:col-span-4 xl:col-start-6 xl:row-span-2 xl:row-start-1 xl:grid-cols-1 xl:grid-rows-[minmax(0,1.6fr)_minmax(min-content,1fr)_minmax(min-content,1fr)]"
          >
            <ChartCard
              title="Mergeados por dia"
              icon={GitMerge}
              iconClass="text-merged"
              meta={
                merged &&
                plural(
                  merged.reduce((sum, d) => sum + d.count, 0),
                  'PR',
                  'PRs',
                )
              }
            >
              {merged ? (
                <ColumnChart
                  tone="merged"
                  columns={merged.map(({ day, count }) => ({
                    key: day,
                    label: day === today ? 'hoje' : weekday.format(fromKey(day)).replace('.', ''),
                    fullLabel: day === today ? 'hoje' : longDay.format(fromKey(day)),
                    value: count,
                  }))}
                  highlightKey={today}
                  unit={(n) => plural(n, 'PR mergeado', 'PRs mergeados')}
                />
              ) : (
                <ChartSkeleton kind="columns" />
              )}
            </ChartCard>

            <ChartCard
              title="Idade dos seus PRs"
              icon={Timer}
              iconClass="text-accent"
              meta={data && 'em destaque, parados'}
            >
              {!data ? (
                <ChartSkeleton kind="bars" />
              ) : authored.length === 0 ? (
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
              icon={Building2}
              iconClass="text-info"
              meta={data && 'PRs e issues'}
            >
              {!data ? (
                <ChartSkeleton kind="bars" />
              ) : owners.length === 0 ? (
                <p className="text-[13px] text-fg-subtle">Nada aberto.</p>
              ) : (
                <BarList
                  tone="info"
                  rows={owners.slice(0, 5).map((load) => ({
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

          <Panel delay={0.24} className="md:col-span-2 xl:col-span-5 xl:row-start-2">
            <StalePanel pullRequests={data ? authored : null} />
          </Panel>

          <Panel
            delay={0.27}
            className="md:col-span-2 xl:col-span-3 xl:col-start-10 xl:row-start-2"
          >
            <PinnedNotesCard className={cn('h-full', LIST_CAP)} />
          </Panel>
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

/** Célula da grade: entra com a animação e passa a altura ao cartão. */
function Panel({
  delay,
  className,
  children,
}: {
  delay: number
  className?: string
  children: ReactNode
}) {
  return (
    <motion.div {...fadeUp(delay)} className={cn('min-h-0', className)}>
      {children}
    </motion.div>
  )
}

/** Título de cartão com ícone na cor do assunto: o mesmo em todo o painel. */
function PanelTitle({
  icon: Icon,
  iconClass,
  children,
}: {
  icon: LucideIcon
  iconClass: string
  children: ReactNode
}) {
  return (
    <CardTitle className="flex min-w-0 items-center gap-2">
      <Icon className={cn('size-3.5 shrink-0', iconClass)} strokeWidth={2} />
      <span className="truncate">{children}</span>
    </CardTitle>
  )
}

const Meta = ({ children }: { children: ReactNode }) => (
  <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{children}</span>
)

function ChartCard({
  title,
  icon,
  iconClass,
  meta,
  children,
}: {
  title: string
  icon: LucideIcon
  iconClass: string
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="flex min-h-48 flex-col overflow-hidden xl:min-h-0">
      <CardHeader>
        <PanelTitle icon={icon} iconClass={iconClass}>
          {title}
        </PanelTitle>
        {meta && <Meta>{meta}</Meta>}
      </CardHeader>
      {/* Os gráficos se ajustam ao espaço: nunca rolam. */}
      <CardBody className="flex flex-col overflow-hidden px-4 py-2.5">
        {/* Em tela alta sobra espaço: as barras ficam no meio, não grudadas no topo. */}
        <div className="flex flex-1 flex-col justify-center">{children}</div>
      </CardBody>
    </Card>
  )
}

/** Esqueleto com a forma do gráfico que vem: colunas ou barras. */
function ChartSkeleton({ kind }: { kind: 'columns' | 'bars' }) {
  if (kind === 'columns') {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando"
        className="flex h-full min-h-20 items-end gap-1"
      >
        {[30, 55, 20, 80, 45, 65, 50].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-b-none"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    )
  }
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-2.5">
      {[70, 45, 85, 30].map((width) => (
        <span key={width} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-3" style={{ width: `${width}%` }} />
        </span>
      ))}
    </div>
  )
}

function AttentionCard({ dashboard }: { dashboard: ReturnType<typeof useQuery<Dashboard>> }) {
  return (
    <Card className={cn('flex h-full flex-col overflow-hidden', LIST_CAP)}>
      <CardHeader>
        <PanelTitle icon={CircleAlert} iconClass="text-accent">
          Precisa da sua atenção
        </PanelTitle>
        {dashboard.data && <Meta>{plural(dashboard.data.attention.length, 'item', 'itens')}</Meta>}
      </CardHeader>
      <CardBody>
        {dashboard.isPending ? (
          <ListSkeleton rows={3} />
        ) : dashboard.isError ? (
          <DashboardError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        ) : dashboard.data.attention.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Nada esperando por você"
            description="Nenhuma review pedida, e seus PRs não têm CI quebrado, conflito ou pedido de mudança."
          />
        ) : (
          <ul className="divide-y divide-border">
            {orderAttention(dashboard.data.attention).map(({ reason, pullRequest }) => (
              <PullRequestRow
                key={pullRequest.id}
                pullRequest={pullRequest}
                reason={reason}
                showAuthor={reason === 'review_requested'}
              />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

/**
 * Seus PRs sem movimento há mais de uma semana, os mais antigos primeiro.
 * Não pedem ação sua no código, mas talvez um lembrete a quem revisa.
 * Sempre aparece, mesmo vazio: o lugar dele na grade não fica em branco.
 */
function StalePanel({ pullRequests }: { pullRequests: PullRequest[] | null }) {
  const stale = pullRequests
    ? applySort(
        pullRequests.filter((pr) => !pr.isDraft && isStale(pr)),
        'antigos',
      )
    : null

  return (
    <Card className={cn('flex h-full flex-col overflow-hidden', LIST_CAP)}>
      <CardHeader>
        <PanelTitle icon={Hourglass} iconClass="text-accent">
          Parados há mais de 7 dias
        </PanelTitle>
        {stale && stale.length > 0 && (
          <Link
            to="/pull-requests"
            search={{ aba: 'meus', ordem: 'antigos' }}
            className="shrink-0 text-[12px] text-fg-muted hover:text-fg"
          >
            Ver todos ({stale.length})
          </Link>
        )}
      </CardHeader>
      <CardBody>
        {!stale ? (
          <ListSkeleton rows={2} />
        ) : stale.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Nenhum PR parado"
            description="Todos os seus PRs abertos tiveram movimento na última semana."
          />
        ) : (
          <ul className="divide-y divide-border">
            {stale.map((pr) => (
              <PullRequestRow key={pr.id} pullRequest={pr} showAuthor={false} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
