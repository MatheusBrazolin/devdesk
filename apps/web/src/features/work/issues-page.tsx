import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { CircleDot, SearchX } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { groupByRepository } from './group-by-repository'
import { IssueRow } from './issue-row'
import { applyFilter, ownerCounts, ownerOf } from './list-filters'
import { DashboardError, ListSkeleton } from './list-states'
import { ListToolbar, type ToolbarValue } from './list-toolbar'
import { dashboardQuery } from './queries'
import { SyncStatus } from './sync-status'

const route = getRouteApi('/app/issues')

export function IssuesPage() {
  const filters = route.useSearch()
  const navigate = route.useNavigate()
  const dashboard = useQuery(dashboardQuery)
  const all = dashboard.data?.issues ?? []
  const visible = applyFilter(all, filters)

  const update = (patch: Partial<ToolbarValue>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Issues</h1>
          {dashboard.data && (
            <p className="mt-0.5 text-[13px] text-fg-muted">
              {dashboard.data.summary.assignedIssues} abertas e atribuídas a você
            </p>
          )}
        </div>
        <SyncStatus />
      </header>

      {all.length > 0 && (
        <ListToolbar
          value={filters}
          onChange={update}
          owners={ownerCounts(all)}
          total={all.length}
          sortable={false}
        />
      )}

      {dashboard.isPending ? (
        <Card>
          <ListSkeleton rows={6} />
        </Card>
      ) : dashboard.isError ? (
        <Card>
          <DashboardError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        </Card>
      ) : all.length === 0 ? (
        <Card>
          <EmptyState
            icon={CircleDot}
            title="Nenhuma issue atribuída"
            description="Issues abertas atribuídas a você aparecem aqui, agrupadas por repositório."
            className="py-10"
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Nada com esse filtro"
            description="Tente outra busca ou mostre todas as organizações."
            className="py-10"
          />
        </Card>
      ) : (
        groupByRepository(visible).map(([repository, issues]) => (
          <Card key={repository} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex min-w-0 items-center gap-2 font-mono text-[12px] font-medium">
                <OwnerAvatar owner={ownerOf(repository)} className="size-5" />
                <span className="truncate">{repository}</span>
              </CardTitle>
              <span className="font-mono text-[11px] text-fg-subtle">{issues.length}</span>
            </CardHeader>
            <ul className="divide-y divide-border">
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} showRepository={false} />
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  )
}
