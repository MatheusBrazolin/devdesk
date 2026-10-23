import type { LucideIcon } from 'lucide-react'
import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { TONE_BG, TONE_CHIP, TONE_TEXT, type Tone } from '@/lib/tones'

interface StatTileProps {
  label: string
  icon: LucideIcon
  tone: Tone
  /** Nulo enquanto carrega: mostra o esqueleto. */
  value: number | null
  /** Contexto curto abaixo do valor; sempre uma linha. */
  hint: string
  /** Minigráfico: os últimos valores, o último em destaque. */
  trend?: number[]
  /** Pinta o número na cor do tom quando há algo a resolver. */
  alert?: boolean
}

/** Classes do cartão: quem usa envolve o conteúdo num Link tipado da rota certa. */
export const statTileClass =
  'group relative flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-border bg-surface p-4 [@media(max-height:50rem)]:gap-2 [@media(max-height:50rem)]:p-3 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop focus-visible:-translate-y-0.5'

/**
 * Indicador do painel. A estrutura é fixa (rótulo, número, contexto em uma
 * linha) para que os quatro cartões tenham a mesma altura e os números fiquem
 * alinhados; o minigráfico fica no canto e não empurra nada.
 */
export function StatTile({ label, icon: Icon, tone, value, hint, trend, alert }: StatTileProps) {
  const max = Math.max(1, ...(trend ?? [0]))
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-fg-muted">{label}</span>
        <span
          className={cn(
            // No celular o cartão é estreito: o rótulo inteiro vale mais que o ícone.
            'hidden size-7 shrink-0 place-items-center rounded-md transition-transform duration-200 group-hover:scale-110 sm:grid',
            TONE_CHIP[tone],
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
      </span>
      <span className="flex items-end justify-between gap-3">
        <span className="min-w-0">
          {value === null ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <span
              className={cn(
                'block text-[28px] leading-7 font-semibold tracking-tight tabular-nums',
                alert && value > 0 ? TONE_TEXT[tone] : 'text-fg',
              )}
            >
              <CountUp value={value} />
            </span>
          )}
          <span className="mt-1.5 block truncate text-[12px] text-fg-subtle">
            {value === null ? ' ' : hint}
          </span>
        </span>
        {trend && (
          <span aria-hidden className="hidden h-8 shrink-0 items-end gap-[3px] sm:flex">
            {trend.map((point, index) => (
              <span
                key={index}
                className={cn(
                  'w-1.5 origin-bottom animate-grow-up rounded-t-[2px]',
                  index === trend.length - 1 ? TONE_BG[tone] : 'bg-chart-muted',
                )}
                style={{
                  height: point === 0 ? 2 : Math.max(3, (point / max) * 32),
                  animationDelay: `${index * 40}ms`,
                }}
              />
            ))}
          </span>
        )}
      </span>
    </>
  )
}

/**
 * Número que conta até o valor na primeira vez e a cada mudança. Escreve
 * direto no texto de um elemento que o React deixa vazio: são dezenas de
 * quadros, sem render a cada um, e o React nunca disputa o mesmo nó de texto.
 * O valor final fica num texto à parte, que é o que o leitor de tela lê.
 */
function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const from = useRef(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const start = reduce ? value : from.current
    from.current = value
    element.textContent = String(start)
    const controls = animate(start, value, {
      duration: reduce ? 0 : 0.6,
      ease: 'easeOut',
      onUpdate: (latest) => {
        element.textContent = String(Math.round(latest))
      },
    })
    return () => controls.stop()
  }, [value, reduce])

  return (
    <>
      <span ref={ref} aria-hidden />
      <span className="sr-only">{value}</span>
    </>
  )
}
