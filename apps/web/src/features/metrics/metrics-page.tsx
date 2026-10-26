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

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

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
          subtitle="Suas últimas 8 semanas no GitHub: entrega, espera e reviews feitas para o time."
          actions={data?.isSample && <Badge tone="accent">dados de exemplo</Badge>}
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
                label="PRs mergeados"
                value={data ? String(data.totals.merged) : null}
                hint="nas 8 semanas"
              />
              <MetricTile
                icon={Clock3}
                tone="accent"
                label="Até o merge"
                value={data ? formatHours(data.totals.medianHoursToMerge) : null}
                hint="mediana, da abertura"
              />
              <MetricTile
                icon={MessageSquare}
                tone="info"
                label="Até a 1ª review"
                value={data ? formatHours(data.totals.medianHoursToFirstReview) : null}
                hint="mediana, de outra pessoa"
              />
              <MetricTile
                icon={Eye}
                tone="success"
                label="Reviews feitas"
                value={data ? String(data.totals.reviews) : null}
                hint="para o time"
              />
              <MetricTile
                icon={FileDiff}
                tone="merged"
                label="Tamanho típico"
                value={
                  data
                    ? data.totals.medianLines === null
                      ? '—'
                      : `${Math.round(data.totals.medianLines)}`
                    : null
                }
                hint="linhas por PR (mediana)"
              />
            </Reveal>

            <Reveal delay={0.08} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard title="Mergeados por semana" icon={GitMerge} iconClass="text-merged">
                {data ? (
                  <ColumnChart
                    tone="merged"
                    highlightKey={current}
                    columns={weeks.map((week) => ({
                      key: week.weekStart,
                      label: weekLabel(week.weekStart),
                      fullLabel: `semana de ${weekLabel(week.weekStart)}`,
                      value: week.merged,
                    }))}
                    unit={(n) => plural(n, 'PR mergeado', 'PRs mergeados')}
                  />
                ) : (
                  <Skeleton className="h-40" />
                )}
              </ChartCard>
              <ChartCard title="Reviews feitas por semana" icon={Eye} iconClass="text-success">
                {data && data.totals.reviews === 0 ? (
                  <p className="grid h-full place-items-center text-center text-[13px] text-fg-muted">
                    Nenhuma review enviada nestas 8 semanas. Quando você revisar PRs do time, elas
                    aparecem aqui.
                  </p>
                ) : data ? (
                  <ColumnChart
                    highlightKey={current}
                    columns={weeks.map((week) => ({
                      key: week.weekStart,
                      label: weekLabel(week.weekStart),
                      fullLabel: `semana de ${weekLabel(week.weekStart)}`,
                      value: week.reviews,
                    }))}
                    unit={(n) => plural(n, 'review feita', 'reviews feitas')}
                  />
                ) : (
                  <Skeleton className="h-40" />
                )}
              </ChartCard>
              <ChartCard title="Tempo até o merge (horas)" icon={Clock3} iconClass="text-accent">
                {data ? (
                  <ColumnChart
                    highlightKey={current}
                    columns={weeks.map((week) => ({
                      key: week.weekStart,
                      label: weekLabel(week.weekStart),
                      fullLabel: `semana de ${weekLabel(week.weekStart)}`,
                      value: Math.round(week.medianHoursToMerge ?? 0),
                    }))}
                    // O número da coluna (horas) aparece no nome: quem usa voz fala o que vê.
                    unit={(n) => `${n} h de mediana até o merge (${formatHours(n)})`}
                  />
                ) : (
                  <Skeleton className="h-40" />
                )}
              </ChartCard>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="text-[13px] leading-relaxed text-fg-muted">
                Os números vêm dos PRs que você mergeou e das reviews que você enviou. A semana
                começa na segunda-feira; a atual ainda está em andamento. Mediana é o valor do meio:
                um PR que demorou muito não distorce o resultado.
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
