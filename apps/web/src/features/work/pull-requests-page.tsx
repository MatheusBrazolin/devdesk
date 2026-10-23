import type { PullRequest } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Eye, GitMerge, GitPullRequest, SearchX } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs } from '@/components/ui/tabs'
import { applyFilter, applySort, isStale, ownerCounts } from './list-filters'
import { DashboardError, ListSkeleton } from './list-states'
import { ListToolbar, type ToolbarValue } from './list-toolbar'
import { PullRequestRow } from './pull-request-row'
import { dashboardQuery } from './queries'
import { SyncStatus } from './sync-status'

export type PullRequestTab = 'review' | 'meus' | 'mergeados'

const route = getRouteApi('/app/pull-requests')

const EMPTY = {
  review: {
    icon: Eye,
    title: 'Nenhuma review pedida',
    description: 'Quando alguém pedir a sua review, o PR aparece aqui.',
  },
  meus: {
    icon: GitPullRequest,
    title: 'Nenhum PR aberto',
    description: 'Seus pull requests abertos aparecem aqui, com CI e aprovações.',
  },
  mergeados: {
    icon: GitMerge,
    title: 'Nada mergeado nesta semana',
    description: 'PRs seus mergeados nos últimos 7 dias aparecem aqui.',
  },
}

export function PullRequestsPage() {
  const { aba, ...filters } = route.useSearch()
  const navigate = route.useNavigate()
  const dashboard = useQuery(dashboardQuery)
  const lists = dashboard.data?.pullRequests

  const byTab: Record<PullRequestTab, PullRequest[]> = {
    review: lists?.reviewRequested ?? [],
    meus: lists?.authored ?? [],
    mergeados: lists?.merged ?? [],
  }
  const all = byTab[aba]
  const visible = applySort(applyFilter(all, filters), filters.ordem ?? 'recentes')
  const empty = EMPTY[aba]

  const update = (patch: Partial<ToolbarValue>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pull requests</h1>
          {dashboard.data && <Summary items={byTab.meus} />}
        </div>
        <SyncStatus />
      </header>

      <Tabs
        layoutId="pr-tabs"
        value={aba}
        // Trocar de aba limpa o filtro de organização, que pode não existir na outra.
        search={(value) => ({ aba: value, q: filters.q })}
        items={[
          {
            value: 'review',
            label: 'Pedidas a você',
            count: dashboard.data?.summary.reviewRequested,
          },
          { value: 'meus', label: 'Seus PRs', count: dashboard.data?.summary.openPullRequests },
          {
            value: 'mergeados',
            label: 'Mergeados (7 dias)',
            count: dashboard.data?.summary.mergedThisWeek,
          },
        ]}
      />

      {all.length > 0 && (
        <ListToolbar
          value={filters}
          onChange={update}
          owners={ownerCounts(all)}
          total={all.length}
        />
      )}

      <Card className="overflow-hidden">
        {dashboard.isPending ? (
          <ListSkeleton rows={6} />
        ) : dashboard.isError ? (
          <DashboardError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        ) : all.length === 0 ? (
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            className="py-10"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nada com esse filtro"
            description="Tente outra busca ou mostre todas as organizações."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((pr) => (
              <PullRequestRow key={pr.id} pullRequest={pr} showAuthor={aba === 'review'} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/** Uma linha que resume os seus PRs abertos: o que está bem e o que está parado. */
function Summary({ items }: { items: PullRequest[] }) {
  if (items.length === 0) return null
  const approved = items.filter(
    (pr) => pr.approvals > 0 && pr.reviewDecision !== 'changes_requested',
  ).length
  const stale = items.filter((pr) => isStale(pr)).length
  const failing = items.filter((pr) => pr.ciStatus === 'failure').length

  const parts = [
    `${items.length} abertos`,
    approved > 0 && `${approved} com aprovação`,
    failing > 0 && `${failing} com CI falhando`,
    stale > 0 && `${stale} parados há mais de 7 dias`,
  ].filter(Boolean)

  return <p className="mt-0.5 text-[13px] text-fg-muted">{parts.join(' · ')}</p>
}
