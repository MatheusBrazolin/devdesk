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
  height?: number
}

/**
 * Colunas de uma série só: sem legenda (o título do cartão diz o que é),
 * barras finas presas à linha de base, valor escrito só no maior e no
 * destacado, o resto no tooltip. Cada coluna é focável e tem o rótulo
 * completo, para teclado e leitor de tela.
 */
export function ColumnChart({ columns, unit, highlightKey, height = 112 }: ColumnChartProps) {
  const max = Math.max(1, ...columns.map((c) => c.value))
  const maxKey = columns.reduce((best, c) => (c.value > best.value ? c : best), columns[0]!).key

  return (
    <figure>
      <div role="list" className="flex items-end gap-0.5 border-b border-border" style={{ height }}>
        {columns.map((column) => {
          const labeled = column.value > 0 && (column.key === maxKey || column.key === highlightKey)
          const barHeight =
            column.value === 0 ? 0 : Math.max(4, (column.value / max) * (height - 18))
          return (
            <ChartTooltip key={column.key} value={unit(column.value)} label={column.fullLabel}>
              <button
                type="button"
                role="listitem"
                aria-label={`${column.fullLabel}: ${unit(column.value)}`}
                className="group flex h-full flex-1 flex-col items-center justify-end rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                {labeled && (
                  <span className="mb-1 text-[11px] font-medium text-fg-muted">{column.value}</span>
                )}
                <span
                  className={cn(
                    'w-full max-w-6 rounded-t-[4px] bg-chart-ink transition-opacity group-hover:opacity-80',
                    column.key === highlightKey && 'bg-chart-accent',
                  )}
                  style={{ height: barHeight }}
                />
              </button>
            </ChartTooltip>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-0.5" aria-hidden>
        {columns.map((column) => (
          <span key={column.key} className="flex-1 text-center text-[11px] text-fg-subtle">
            {column.label}
          </span>
        ))}
      </div>
    </figure>
  )
}
