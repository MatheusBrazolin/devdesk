import type { PullRequest } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Eye, GitMerge, GitPullRequest, SearchX } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs } from '@/components/ui/tabs'
import { applyFilter, applySort, isStale, ownerCounts } from './list-filters'
import { DashboardError, ListSkeleton } from './list-states'
import { ListToolbar, type ToolbarValue } from './list-toolbar'
import { PullRequestRow } from './pull-request-row'
import { orderReviewQueue } from './review-queue'
import { dashboardQuery } from './queries'
import { SyncStatus } from './sync-status'
import { plural, t } from '@/lib/i18n'

export type PullRequestTab = 'review' | 'meus' | 'mergeados'

const route = getRouteApi('/app/pull-requests')

const EMPTY = {
  review: {
    icon: Eye,
    title: t('Nenhuma review pedida'),
    description: t('Quando alguém pedir a sua review, o PR aparece aqui.'),
  },
  meus: {
    icon: GitPullRequest,
    title: t('Nenhum PR aberto'),
    description: t('Seus pull requests abertos aparecem aqui, com CI e aprovações.'),
  },
  mergeados: {
    icon: GitMerge,
    title: t('Nada mergeado nesta semana'),
    description: t('PRs seus mergeados nos últimos 7 dias aparecem aqui.'),
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
  // Na aba de reviews, a ordem padrão é a da fila: o que destrava mais gente primeiro.
  const order = filters.ordem ?? (aba === 'review' ? 'prioridade' : 'recentes')
  const filtered = applyFilter(all, filters)
  const visible = order === 'prioridade' ? orderReviewQueue(filtered) : applySort(filtered, order)
  const empty = EMPTY[aba]

  const update = (patch: Partial<ToolbarValue>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <div className="flex flex-col gap-5 desk:h-full desk:min-h-0">
      <PageHeader
        section="/pull-requests"
        subtitle={dashboard.data ? summary(byTab.meus) : undefined}
        actions={<SyncStatus />}
      />

      <Reveal delay={0.05}>
        <Tabs
          layoutId="pr-tabs"
          value={aba}
          // Trocar de aba limpa o filtro de organização, que pode não existir na outra.
          search={(value) => ({ aba: value, q: filters.q })}
          items={[
            {
              value: 'review',
              label: t('Pedidas a você'),
              count: dashboard.data?.summary.reviewRequested,
            },
            {
              value: 'meus',
              label: t('Seus PRs'),
              count: dashboard.data?.summary.openPullRequests,
            },
            {
              value: 'mergeados',
              label: t('Mergeados (7 dias)'),
              count: dashboard.data?.summary.mergedThisWeek,
            },
          ]}
        />
      </Reveal>

      {all.length > 0 && (
        <ListToolbar
          value={filters}
          onChange={update}
          owners={ownerCounts(all)}
          total={all.length}
          orders={
            aba === 'review'
              ? ['prioridade', 'recentes', 'antigos', 'repositorio']
              : ['recentes', 'antigos', 'repositorio']
          }
          defaultOrder={aba === 'review' ? 'prioridade' : 'recentes'}
        />
      )}

      <Reveal delay={0.1} className="desk:flex desk:min-h-0 desk:flex-1 desk:flex-col">
        <Card className="scroll-thin overflow-hidden desk:min-h-0 desk:flex-1 desk:overflow-y-auto">
          {dashboard.isPending ? (
            <ListSkeleton rows={6} />
          ) : dashboard.isError && !dashboard.data ? (
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
              title={t('Nada com esse filtro')}
              description={t(
                'Tente outra busca: o DevDesk ignora acentos e acha palavra por palavra.',
              )}
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((pr) => (
                <PullRequestRow
                  key={pr.id}
                  pullRequest={pr}
                  showAuthor={aba === 'review'}
                  review={aba === 'review'}
                />
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
    </div>
  )
}

/** Uma linha que resume os seus PRs abertos: o que está bem e o que está parado. */
function summary(items: PullRequest[]): string | undefined {
  if (items.length === 0) return undefined
  const approved = items.filter(
    (pr) =>
      pr.approvals > 0 && pr.changesRequested === 0 && pr.reviewDecision !== 'changes_requested',
  ).length
  const stale = items.filter((pr) => isStale(pr)).length
  const failing = items.filter((pr) => pr.ciStatus === 'failure').length

  const parts = [
    plural(items.length, '{n} aberto', '{n} abertos'),
    approved > 0 && t('{n} com aprovação', { n: approved }),
    failing > 0 && t('{n} com CI falhando', { n: failing }),
    stale > 0 && plural(stale, '{n} parado há mais de 7 dias', '{n} parados há mais de 7 dias'),
  ].filter(Boolean)

  return parts.join(' · ')
}
