import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { meQuery } from '@/features/auth/queries'
import { TokenAlertNotice } from '@/features/settings/token-alert'
import { DashboardError } from '@/features/work/list-states'
import { dashboardQuery, useRefreshDashboard } from '@/features/work/queries'
import { dateKey } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { firstName, formatLongDate, greetingFor } from '@/lib/greeting'
import { t } from '@/lib/i18n'
import { formatRelative } from '@/lib/time'
import { mergedPerDay } from './dashboard-metrics'
import { OrgAccessHint } from './org-access-hint'
import { buildBoard, IN_PROGRESS_LIST_LIMIT } from './quadro/board'
import { Column, EmptyLine, InProgressSummary, MergedChart, PrCard } from './quadro/board-view'
import { AgePanel, AgendaNotesPanel, OwnersPanel } from './quadro/panels'

/**
 * O Hoje: a saudação com os quatro números do dia, os PRs num quadro por
 * situação e três painéis de apoio. A barra superior vem do AppShell.
 */
export function HomePage() {
  const { user } = useSuspenseQuery(meQuery).data
  const dashboard = useQuery(dashboardQuery)
  const now = new Date()
  const today = dateKey(now)
  const data = dashboard.data
  const board = data ? buildBoard(data, now) : null
  const merged = data ? mergedPerDay(data.pullRequests.merged, today) : null

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="min-w-0">
          <h1 className="text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[44px]">
            {greetingFor(now)}, {firstName(user.name, user.login)}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[15px] text-q-text2">
            <span className="first-letter:uppercase">{formatLongDate(now)}</span>
            <span aria-hidden>·</span>
            <FreshnessNote />
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-11 gap-y-5">
          <Stat
            label={t('Reviews pedidas')}
            value={data?.summary.reviewRequested}
            to={{ to: '/pull-requests', search: { aba: 'review' } }}
          />
          <Stat
            label={t('PRs abertos')}
            value={data?.summary.openPullRequests}
            to={{ to: '/pull-requests', search: { aba: 'meus' } }}
          />
          <Stat
            label={t('Issues com você')}
            value={data?.summary.assignedIssues}
            to={{ to: '/issues' }}
          />
          <Stat
            label={t('Mergeados em 7 dias')}
            value={data?.summary.mergedThisWeek}
            to={{ to: '/pull-requests', search: { aba: 'mergeados' } }}
            highlight
          />
        </dl>
      </header>

      <TokenAlertNotice id="token-hoje-renovar" />
      <OrgAccessHint data={data} isDemo={user.isDemo} />

      {dashboard.isError ? (
        <div className="rounded-q-panel border border-q-line bg-q-col p-2">
          <DashboardError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-5">
          <Column
            title={t('Precisa de você')}
            dot="coral"
            count={board?.needsYou.length ?? null}
            footer={
              board && !board.hasReviewRequests ? t('Nenhuma review foi pedida a você.') : null
            }
          >
            {!board ? (
              <EmptyLine>{t('Carregando')}</EmptyLine>
            ) : board.needsYou.length === 0 ? (
              <EmptyLine>{t('Nada esperando por você.')}</EmptyLine>
            ) : (
              board.needsYou.map((card) => <PrCard key={card.pullRequest.id} card={card} />)
            )}
          </Column>

          <Column title={t('Parados há +7 dias')} dot="sun" count={board?.stale.length ?? null}>
            {!board ? (
              <EmptyLine>{t('Carregando')}</EmptyLine>
            ) : board.stale.length === 0 ? (
              <EmptyLine>{t('Nenhum PR parado.')}</EmptyLine>
            ) : (
              board.stale.map((card) => <PrCard key={card.pullRequest.id} card={card} showIdle />)
            )}
          </Column>

          <Column title={t('Em andamento')} dot="lime" count={board?.inProgress.length ?? null}>
            {!board ? (
              <EmptyLine>{t('Carregando')}</EmptyLine>
            ) : board.inProgress.length === 0 ? (
              <EmptyLine>{t('Nenhum PR em andamento.')}</EmptyLine>
            ) : board.inProgress.length > IN_PROGRESS_LIST_LIMIT ? (
              <InProgressSummary count={board.inProgress.length} />
            ) : (
              board.inProgress.map((card) => <PrCard key={card.pullRequest.id} card={card} />)
            )}
          </Column>

          <Column
            title={t('Mergeados na semana')}
            dot="muted"
            count={merged ? merged.reduce((sum, day) => sum + day.count, 0) : null}
          >
            {merged ? (
              <MergedChart days={merged} today={today} />
            ) : (
              <EmptyLine>{t('Carregando')}</EmptyLine>
            )}
          </Column>
        </div>
      )}

      <div className="flex flex-wrap gap-5">
        <AgePanel authored={data?.pullRequests.authored ?? null} />
        <OwnersPanel authored={data?.pullRequests.authored ?? null} issues={data?.issues ?? null} />
        <AgendaNotesPanel />
      </div>
    </div>
  )
}

type StatLink =
  { to: '/pull-requests'; search: { aba: 'review' | 'meus' | 'mergeados' } } | { to: '/issues' }

/** Um número do dia: rótulo em cima, valor embaixo, e leva à lista. */
function Stat({
  label,
  value,
  to,
  highlight,
}: {
  label: string
  value: number | undefined
  to: StatLink
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-[13px] text-q-text3">{label}</dt>
      <dd>
        <Link
          {...(to as { to: '/issues' })}
          className={cn(
            'q-ease mt-1 block rounded-sm text-[34px] leading-none font-semibold tracking-tight hover:text-q-text2',
            highlight ? 'text-q-lime' : 'text-q-text',
          )}
          aria-label={value === undefined ? label : t('{rotulo}: {n}', { rotulo: label, n: value })}
        >
          {value ?? '–'}
        </Link>
      </dd>
    </div>
  )
}

/** "dados do GitHub atualizados agora" e o botão discreto de buscar de novo. */
function FreshnessNote() {
  const { data, isFetching } = useQuery(dashboardQuery)
  const refresh = useRefreshDashboard()
  const busy = isFetching || refresh.isPending
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const quando = data ? formatRelative(new Date(data.fetchedAt), now) : ''

  return (
    <span className="flex items-center gap-1.5">
      {data &&
        (data.isSample
          ? t('dados de exemplo atualizados {quando}', { quando })
          : t('dados do GitHub atualizados {quando}', { quando }))}
      <button
        type="button"
        disabled={busy}
        aria-label={t('Atualizar agora')}
        title={t('Atualizar agora')}
        onClick={() =>
          refresh.mutate(undefined, {
            onError: (error) =>
              toast.error(t('Não foi possível atualizar'), { description: error.message }),
          })
        }
        className="q-ease grid size-7 place-items-center rounded-full text-q-text3 hover:bg-q-col hover:text-q-text disabled:opacity-50"
      >
        <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} aria-hidden />
      </button>
    </span>
  )
}
