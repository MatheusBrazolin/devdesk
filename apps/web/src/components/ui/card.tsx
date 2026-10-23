import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Painel com borda. Sem sombra: profundidade é para o que flutua. */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section className={cn('rounded-lg border border-border bg-surface', className)} {...props} />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      className={cn(
        'flex h-11 items-center justify-between gap-3 border-b border-border px-4',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('text-[13px] font-semibold', className)} {...props} />
}

/**
 * Corpo que ocupa o resto do cartão e rola por dentro quando não cabe: no
 * painel, o cartão tem altura fixa e a página não rola.
 */
export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('scroll-thin min-h-0 flex-1 overflow-y-auto', className)} {...props} />
}
