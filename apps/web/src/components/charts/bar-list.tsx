import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ChartTooltip } from './chart-tooltip'

export interface BarRow {
  key: string
  label: ReactNode
  /** Texto do rótulo, para tooltip e tabela. */
  labelText: string
  value: number
  /** Destaca a linha na cor de ênfase; o resto fica no cinza de contexto. */
  emphasis?: boolean
}

interface BarListProps {
  rows: BarRow[]
  unit: (value: number) => string
  /**
   * Cor das barras sem ênfase: tinta ou azul-petróleo (série única) ou cinza
   * (contexto da ênfase).
   */
  tone?: 'ink' | 'muted' | 'info'
}

const TONE = { ink: 'bg-chart-ink', muted: 'bg-chart-muted', info: 'bg-accent' }

/**
 * Barras horizontais com o valor escrito na ponta de cada uma. Escrever todos
 * os valores aqui é de propósito: são poucas linhas e o cinza de contexto tem
 * pouco contraste com o fundo, então o número carrega a leitura.
 */
export function BarList({ rows, unit, tone = 'ink' }: BarListProps) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <figure>
      <ul className="space-y-1">
        {rows.map((row, index) => (
          <li key={row.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
            {/* O rótulo visível se repete no aria-label do botão: leitor de tela ouve uma vez só. */}
            <span
              aria-hidden
              className="flex min-w-0 items-center gap-1.5 text-[12px] text-fg-muted"
            >
              {row.label}
            </span>
            <ChartTooltip value={unit(row.value)} label={row.labelText}>
              <button
                type="button"
                aria-label={`${row.labelText}: ${unit(row.value)}`}
                className="group flex h-4 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    'h-3 origin-left animate-grow-right rounded-r-[4px] transition-opacity group-hover:opacity-80',
                    row.emphasis ? 'bg-warning' : TONE[tone],
                  )}
                  style={{
                    width: row.value === 0 ? 0 : `max(4px, ${(row.value / max) * 85}%)`,
                    animationDelay: `${index * 50}ms`,
                  }}
                />
                <span aria-hidden className="text-[12px] font-medium text-fg tabular-nums">
                  {row.value}
                </span>
              </button>
            </ChartTooltip>
          </li>
        ))}
      </ul>
    </figure>
  )
}
