import { useQuery } from '@tanstack/react-query'
import { Clock3, Eye, FileDiff, GitMerge, type LucideIcon, MessageSquare } from 'lucide-react'
import type { ReactNode } from 'react'
import { ChartTooltipProvider } from '@/components/charts/chart-tooltip'
import { ColumnChart } from '@/components/charts/column-chart'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricTile } from '@/components/ui/metric-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardError } from '@/features/work/list-states'
import { cn } from '@/lib/cn'
import { formatHours, weekLabel } from './format'
import { metricsQuery } from './queries'
import { plural, t } from '@/lib/i18n'

/**
 * Minhas métricas: as últimas oito semanas de entrega e de review, para
 * enxergar o próprio ritmo (e levar a uma conversa de 1:1).
 */
export function MetricsPage() {
  const metrics = useQuery(metricsQuery)
  const data = metrics.data
  const weeks = data?.weeks ?? []
  const current = weeks.at(-1)?.weekStart

  return (
    <ChartTooltipProvider>
      <div className="space-y-5">
        <PageHeader
          section="/metricas"
          subtitle={t(
            'Suas últimas 8 semanas no GitHub: entrega, espera e reviews feitas para o time.',
          )}
          actions={data?.isSample && <Badge tone="accent">{t('dados de exemplo')}</Badge>}
        />

        {metrics.isError ? (
          <Card>
            <DashboardError error={metrics.error} onRetry={() => void metrics.refetch()} />
          </Card>
        ) : (
          <>
            <Reveal delay={0.04} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              <MetricTile
                icon={GitMerge}
                tone="merged"
                label={t('PRs mergeados')}
                value={data ? String(data.totals.merged) : null}
                hint={t('nas 8 semanas')}
              />
              <MetricTile
                icon={Clock3}
                tone="accent"
                label={t('Até o merge')}
                value={data ? formatHours(data.totals.medianHoursToMerge) : null}
                hint={t('mediana, da abertura')}
              />
              <MetricTile
                icon={MessageSquare}
                tone="info"
                label={t('Até a 1ª review')}
                value={data ? formatHours(data.totals.medianHoursToFirstReview) : null}
                hint={t('mediana, de outra pessoa')}
              />
              <MetricTile
                icon={Eye}
                tone="success"
                label={t('Reviews feitas')}
                value={data ? String(data.totals.reviews) : null}
                hint={t('para o time')}
              />
              <MetricTile
                icon={FileDiff}
                tone="info"
                label={t('Tamanho típico')}
                value={
                  data
                    ? data.totals.medianLines === null
                      ? '—'
                      : `${Math.round(data.totals.medianLines)}`
                    : null
                }
                hint={t('linhas por PR (mediana)')}
              />
            </Reveal>

            <Reveal delay={0.08} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard title={t('Mergeados por semana')} icon={GitMerge} iconClass="text-merged">
                {data ? (
                  <ColumnChart
                    tone="merged"
                    highlightKey={current}
                    columns={weeks.map((week) => ({
                      key: week.weekStart,
                      label: weekLabel(week.weekStart),
                      fullLabel: t('semana de {semana}', { semana: weekLabel(week.weekStart) }),
                      value: week.merged,
                    }))}
                    unit={(n) => plural(n, '{n} PR mergeado', '{n} PRs mergeados')}
                  />
                ) : (
                  <Skeleton className="h-40" />
                )}
              </ChartCard>
              <ChartCard title={t('Reviews feitas por semana')} icon={Eye} iconClass="text-success">
                {data && data.totals.reviews === 0 ? (
                  <p className="grid h-full place-items-center text-center text-[13px] text-fg-muted">
                    {t(
                      'Nenhuma review enviada nestas 8 semanas. Quando você revisar PRs do time, elas aparecem aqui.',
                    )}
                  </p>
                ) : data ? (
                  <ColumnChart
                    highlightKey={current}
                    columns={weeks.map((week) => ({
                      key: week.weekStart,
                      label: weekLabel(week.weekStart),
                      fullLabel: t('semana de {semana}', { semana: weekLabel(week.weekStart) }),
                      value: week.reviews,
                    }))}
                    unit={(n) => plural(n, '{n} review feita', '{n} reviews feitas')}
                  />
                ) : (
                  <Skeleton className="h-40" />
                )}
              </ChartCard>
              <ChartCard
                title={t('Tempo até o merge (horas)')}
                icon={Clock3}
                iconClass="text-accent"
              >
                {data ? (
                  <ColumnChart
                    highlightKey={current}
                    columns={weeks.map((week) => ({
                      key: week.weekStart,
                      label: weekLabel(week.weekStart),
                      fullLabel: t('semana de {semana}', { semana: weekLabel(week.weekStart) }),
                      value: Math.round(week.medianHoursToMerge ?? 0),
                    }))}
                    // O número da coluna (horas) aparece no nome: quem usa voz fala o que vê.
                    unit={(n) =>
                      t('{n} h de mediana até o merge ({tempo})', { n, tempo: formatHours(n) })
                    }
                  />
                ) : (
                  <Skeleton className="h-40" />
                )}
              </ChartCard>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="text-[13px] leading-relaxed text-fg-muted">
                {t(
                  'Os números vêm dos PRs que você mergeou e das reviews que você enviou. A semana começa na segunda-feira; a atual ainda está em andamento. Mediana é o valor do meio: um PR que demorou muito não distorce o resultado.',
                )}
              </p>
            </Reveal>
          </>
        )}
      </div>
    </ChartTooltipProvider>
  )
}

function ChartCard({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string
  icon: LucideIcon
  iconClass: string
  children: ReactNode
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={cn('size-3.5 shrink-0', iconClass)} strokeWidth={2} />
          {title}
        </CardTitle>
      </CardHeader>
      {/* Altura fixa: o gráfico de colunas ocupa a altura que o pai der. */}
      <div className="h-64 px-4 py-3">{children}</div>
    </Card>
  )
}
