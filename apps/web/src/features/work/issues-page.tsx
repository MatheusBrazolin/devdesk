import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { CircleDot, SearchX } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { groupByRepository } from './group-by-repository'
import { IssueRow } from './issue-row'
import { applyFilter, ownerCounts, ownerOf } from './list-filters'
import { DashboardError, ListSkeleton } from './list-states'
import { ListToolbar, type ToolbarValue } from './list-toolbar'
import { dashboardQuery } from './queries'
import { SyncStatus } from './sync-status'
import { t } from '@/lib/i18n'

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
    <div className="flex flex-col gap-5 desk:h-full desk:min-h-0">
      <PageHeader
        section="/issues"
        subtitle={
          dashboard.data &&
          t('{n} abertas e atribuídas a você', { n: dashboard.data.summary.assignedIssues })
        }
        actions={<SyncStatus />}
      />

      {all.length > 0 && (
        <ListToolbar
          value={filters}
          onChange={update}
          owners={ownerCounts(all)}
          total={all.length}
          sortable={false}
        />
      )}

      {/* No computador, os repositórios ficam em duas colunas e a área rola por dentro. */}
      <div className="scroll-thin flex flex-col gap-5 desk:grid desk:min-h-0 desk:flex-1 desk:grid-cols-2 desk:content-start desk:overflow-y-auto desk:pr-1">
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
              title={t('Nenhuma issue atribuída')}
              description={t(
                'Issues abertas atribuídas a você aparecem aqui, agrupadas por repositório.',
              )}
              className="py-10"
            />
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={SearchX}
              title={t('Nada com esse filtro')}
              description={t('Tente outra busca ou mostre todas as organizações.')}
              className="py-10"
            />
          </Card>
        ) : (
          groupByRepository(visible).map(([repository, issues], index) => (
            <Reveal key={repository} delay={0.05 + Math.min(index, 6) * 0.04}>
              <Card className="overflow-hidden">
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
            </Reveal>
          ))
        )}
      </div>
    </div>
  )
}
