import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/tones'

/**
 * Um número de destaque: rótulo em cima, valor grande, contexto embaixo. O
 * ícone fica no tipo por compatibilidade; o Quadro não usa ícone em quadrado.
 */
export function MetricTile({
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  tone: Tone
  label: string
  value: string | null
  hint: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-q-panel border border-border bg-surface p-5">
      <span className="truncate text-[13px] text-fg-subtle">{label}</span>
      {value === null ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <span
          className={cn(
            'text-[34px] leading-none font-semibold tracking-tight tabular-nums',
            tone === 'merged' ? 'text-accent' : 'text-fg',
          )}
        >
          {value}
        </span>
      )}
      <span className="truncate text-[13px] text-fg-subtle">{hint}</span>
    </div>
  )
}
