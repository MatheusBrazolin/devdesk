import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface StatTileProps {
  label: string
  value: number | null
  /** Contexto curto abaixo do valor. */
  hint: ReactNode
  /** Minigráfico: os últimos valores, o último em destaque. */
  trend?: number[]
  /** Pinta o valor como alerta quando há algo a resolver. */
  tone?: 'default' | 'attention'
}

/** Indicador do painel: rótulo, número grande, contexto e, se houver, tendência. */
/** Classes do cartão: quem usa envolve o conteúdo num Link tipado da rota certa. */
export const statTileClass =
  'group flex flex-col justify-between gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong'

export function StatTile({ label, value, hint, trend, tone = 'default' }: StatTileProps) {
  const max = Math.max(1, ...(trend ?? [0]))
  return (
    <>
      <span className="text-[12px] text-fg-muted">{label}</span>
      <span className="flex items-end justify-between gap-3">
        <span>
          <span
            className={cn(
              'block text-[28px] leading-none font-semibold tracking-tight',
              value === null && 'text-fg-subtle',
              tone === 'attention' && value ? 'text-accent' : 'text-fg',
            )}
          >
            {value ?? '—'}
          </span>
          <span className="mt-1.5 block text-[12px] text-fg-subtle">{hint}</span>
        </span>
        {trend && (
          <span aria-hidden className="flex h-8 items-end gap-0.5">
            {trend.map((point, index) => (
              <span
                key={index}
                className={cn(
                  'w-1.5 rounded-t-[2px]',
                  index === trend.length - 1 ? 'bg-chart-accent' : 'bg-chart-muted',
                )}
                style={{ height: point === 0 ? 2 : Math.max(3, (point / max) * 32) }}
              />
            ))}
          </span>
        )}
      </span>
    </>
  )
}
