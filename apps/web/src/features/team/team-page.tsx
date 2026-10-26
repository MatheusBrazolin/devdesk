import type { Team, TeamPullRequest } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { Clock3, GitPullRequest, Hourglass, MessageSquareDashed, Users } from 'lucide-react'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricTile } from '@/components/ui/metric-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { formatHours } from '@/features/metrics/format'
import { DashboardError } from '@/features/work/list-states'
import { formatWaiting, OVERDUE_AFTER_HOURS } from '@/features/work/review-queue'
import { cn } from '@/lib/cn'
import { teamQuery } from './queries'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Painel do time: os PRs abertos nos repositórios em que você trabalha,
 * quem espera review há mais tempo e com quem as reviews estão acumulando.
 */
export function TeamPage() {
  const team = useQuery(teamQuery)
  const data = team.data

  return (
    <div className="space-y-5">
      <PageHeader
        section="/time"
        subtitle="Os PRs abertos nos repositórios em que você trabalha: quem espera e quem está com reviews acumuladas."
        actions={data?.isSample && <Badge tone="accent">dados de exemplo</Badge>}
      />

      {team.isError ? (
        <Card>
          <DashboardError error={team.error} onRetry={() => void team.refetch()} />
        </Card>
      ) : (
        <>
          <Reveal delay={0.04} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <MetricTile
              icon={GitPullRequest}
              tone="success"
              label="PRs abertos"
              value={data ? String(data.totals.open) : null}
              hint={data ? plural(data.repositories.length, 'repositório', 'repositórios') : ''}
            />
            <MetricTile
              icon={MessageSquareDashed}
              tone="accent"
              label="Sem nenhuma review"
              value={data ? String(data.totals.withoutReview) : null}
              hint="ninguém olhou ainda"
            />
            <MetricTile
              icon={Hourglass}
              tone="info"
              label="Parados"
              value={data ? String(data.totals.stale) : null}
              hint="sem movimento há 3 dias"
            />
            <MetricTile
              icon={Clock3}
              tone="merged"
              label="Espera típica"
              value={data ? formatHours(data.totals.medianHoursWaiting) : null}
              hint="mediana, dos que esperam"
            />
          </Reveal>

          <Reveal
            delay={0.08}
            className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"
          >
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hourglass className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
                  Esperando review
                </CardTitle>
                {data && (
                  <span className="font-mono text-[12px] text-fg-subtle">{data.queue.length}</span>
                )}
              </CardHeader>
              {!data ? (
                <QueueSkeleton />
              ) : data.queue.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Ninguém esperando"
                  description="Todos os PRs abertos do time já têm aprovação."
                />
              ) : (
                <ol aria-label="PRs esperando review" className="divide-y divide-border">
                  {data.queue.map((pr) => (
                    <QueueRow key={pr.id} pr={pr} />
                  ))}
                </ol>
              )}
            </Card>

            <Card className="self-start overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-3.5 shrink-0 text-success" strokeWidth={2} />
                  Reviews pendentes por pessoa
                </CardTitle>
              </CardHeader>
              {!data ? <QueueSkeleton rows={4} /> : <ReviewLoad load={data.reviewLoad} />}
            </Card>
          </Reveal>

          {data && data.repositories.length > 0 && (
            <p className="text-[12px] text-fg-subtle">
              Repositórios: {data.repositories.join(', ')}. Saem dos seus PRs e reviews; rascunhos
              ficam de fora. Só leitura, como todo o DevDesk.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function QueueRow({ pr }: { pr: TeamPullRequest }) {
  const overdue = pr.waitingHours >= OVERDUE_AFTER_HOURS
  return (
    <li>
      <a
        href={pr.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-3 px-4 py-2.5 hover:bg-elevated/50"
      >
        <Avatar name={null} login={pr.author.login} src={pr.author.avatarUrl} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{pr.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-fg-subtle">
            <span>
              {pr.repository}#{pr.number}
            </span>
            <span>de {pr.author.login}</span>
            <span className={cn(overdue && 'text-accent')}>{formatWaiting(pr.waitingHours)}</span>
            {pr.lines !== null && <span>{pr.lines} linhas</span>}
          </span>
          {pr.pendingReviewers.length > 0 && (
            <span className="mt-0.5 block truncate text-[12px] text-fg-muted">
              aguarda {pr.pendingReviewers.join(', ')}
            </span>
          )}
        </span>
        {pr.reviews === 0 && (
          <Badge tone="accent" className="shrink-0">
            sem review
          </Badge>
        )}
      </a>
    </li>
  )
}

/** Barras horizontais de uma série só: o tamanho é a quantidade, o número fica escrito ao lado. */
function ReviewLoad({ load }: { load: Team['reviewLoad'] }) {
  if (load.length === 0) {
    return <p className="px-4 py-6 text-[13px] text-fg-muted">Nenhuma review pendente no time.</p>
  }
  const max = Math.max(...load.map((item) => item.pending))
  return (
    <ul aria-label="Reviews pendentes por pessoa" className="space-y-2.5 px-4 py-3">
      {load.map((item) => (
        <li key={item.reviewer} className="grid grid-cols-[7rem_1fr_1.5rem] items-center gap-2">
          <span
            className={cn(
              'truncate text-[12px]',
              item.reviewer === 'você' ? 'font-semibold text-fg' : 'text-fg-muted',
            )}
          >
            {item.reviewer}
          </span>
          <span aria-hidden className="h-2 overflow-hidden rounded-full bg-elevated">
            <span
              className="block h-full rounded-full bg-success"
              style={{ width: `${(item.pending / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-mono text-[12px] text-fg tabular-nums">
            {item.pending}
            <span className="sr-only"> {item.pending === 1 ? 'review' : 'reviews'}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function QueueSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-3 px-4 py-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-8" />
      ))}
    </div>
  )
}
