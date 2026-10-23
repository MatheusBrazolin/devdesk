import { cn } from '@/lib/cn'
import { ChartTooltip } from './chart-tooltip'

export interface Column {
  key: string
  /** Rótulo curto no eixo ("seg"). */
  label: string
  /** Rótulo completo no tooltip e na tabela ("seg., 19 de out."). */
  fullLabel: string
  value: number
}

interface ColumnChartProps {
  columns: Column[]
  /** Nome do que é contado, para o tooltip e a tabela ("PRs mergeados"). */
  unit: (value: number) => string
  /** Coluna que ganha o rótulo além do máximo (ex.: hoje). */
  highlightKey?: string
  /** Cor da série. Uma série só: a cor diz o que é, como no resto do painel. */
  tone?: 'ink' | 'merged'
}

const BAR = { ink: 'bg-chart-ink', merged: 'bg-merged' }

/**
 * Colunas de uma série só: sem legenda (o título do cartão diz o que é),
 * barras finas presas à linha de base, valor escrito só no maior e no
 * destacado, o resto no tooltip. Ocupa a altura que o cartão der. Cada
 * coluna é focável e tem o rótulo completo, para teclado e leitor de tela.
 */
export function ColumnChart({ columns, unit, highlightKey, tone = 'ink' }: ColumnChartProps) {
  const max = Math.max(1, ...columns.map((c) => c.value))
  const maxKey = columns.reduce((best, c) => (c.value > best.value ? c : best), columns[0]!).key

  return (
    <figure className="flex h-full min-h-20 flex-col">
      <div role="list" className="flex flex-1 items-end gap-1 border-b border-border">
        {columns.map((column, index) => {
          const labeled = column.value > 0 && (column.key === maxKey || column.key === highlightKey)
          const highlighted = column.key === highlightKey
          return (
            <ChartTooltip key={column.key} value={unit(column.value)} label={column.fullLabel}>
              <button
                type="button"
                role="listitem"
                aria-label={`${column.fullLabel}: ${unit(column.value)}`}
                className="group flex h-full flex-1 flex-col items-center justify-end rounded-sm pt-4 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {/* A barra vive numa caixa de altura cheia: a porcentagem é do espaço útil. */}
                <span className="relative flex w-full flex-1 flex-col items-center justify-end">
                  {labeled && (
                    <span className="mb-1 text-[11px] font-medium text-fg-muted tabular-nums">
                      {column.value}
                    </span>
                  )}
                  <span
                    className={cn(
                      'w-full max-w-7 origin-bottom 2xl:max-w-12 animate-grow-up rounded-t-[4px] transition-opacity group-hover:opacity-80',
                      BAR[tone],
                      !highlighted && tone !== 'ink' && 'opacity-55',
                      highlighted && tone === 'ink' && 'bg-chart-accent',
                    )}
                    style={{
                      height: column.value === 0 ? 0 : `max(4px, ${(column.value / max) * 85}%)`,
                      animationDelay: `${index * 45}ms`,
                    }}
                  />
                </span>
              </button>
            </ChartTooltip>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1" aria-hidden>
        {columns.map((column) => (
          <span
            key={column.key}
            className={cn(
              'flex-1 text-center text-[11px] text-fg-subtle',
              column.key === highlightKey && 'font-medium text-fg',
            )}
          >
            {column.label}
          </span>
        ))}
      </div>
    </figure>
  )
}
