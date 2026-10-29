import { Link, useRouterState } from '@tanstack/react-router'
import { Timer } from 'lucide-react'
import { cn } from '@/lib/cn'
import { t } from '@/lib/i18n'
import { formatClock, remainingMs, useNow, useTimer } from './focus-timer'

/**
 * O bloco de foco continua à vista fora da página de Foco: uma pílula na
 * barra com o tempo que falta, que leva de volta ao cronômetro.
 */
export function FocusPill() {
  const timer = useTimer()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const now = useNow(timer.status === 'running', 1_000)
  if (timer.status === 'idle' || pathname.startsWith('/foco')) return null

  const left = formatClock(remainingMs(timer, now))
  const paused = timer.status === 'paused'
  return (
    <Link
      to="/foco"
      aria-label={
        paused
          ? t('Foco pausado, faltam {tempo}', { tempo: left })
          : t('Foco: faltam {tempo}', { tempo: left })
      }
      className={cn(
        'q-ease flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 font-quadro-mono text-[14px]',
        paused
          ? 'border-q-line bg-q-col text-q-text3 hover:text-q-text2'
          : 'border-q-accent/40 bg-q-accent/10 text-q-accent hover:bg-q-accent/15',
      )}
    >
      <Timer className="size-4 shrink-0" aria-hidden />
      <span aria-hidden className="tabular-nums">
        {left}
      </span>
    </Link>
  )
}
