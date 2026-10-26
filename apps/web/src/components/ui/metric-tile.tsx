import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { TONE_CHIP, type Tone } from '@/lib/tones'

/** Um número de destaque com rótulo, ícone e uma linha de contexto. Nulo: carregando. */
export function MetricTile({
  icon: Icon,
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
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-fg-muted">{label}</span>
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-md', TONE_CHIP[tone])}>
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
      </span>
      {value === null ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <span className="text-[26px] leading-7 font-semibold tracking-tight tabular-nums">
          {value}
        </span>
      )}
      <span className="truncate text-[12px] text-fg-subtle">{hint}</span>
    </div>
  )
}
