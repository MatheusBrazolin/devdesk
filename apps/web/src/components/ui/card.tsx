import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/**
 * Painel do Quadro: fundo das colunas, borda fina e raio 22. Sem sombra.
 * `relative` prende o que é absoluto (textos só para leitor de tela) dentro do
 * painel; sem isso, eles escapam da rolagem e esticam a página.
 */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('relative rounded-q-panel border border-border bg-surface', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      className={cn('flex min-h-14 items-center justify-between gap-3 px-4 pt-3', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('text-[15px] font-semibold', className)} {...props} />
}

/**
 * Corpo que ocupa o resto do cartão e rola por dentro quando não cabe (no
 * modo TV, o cartão tem altura fixa e a página não rola).
 */
export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('scroll-thin min-h-0 flex-1 overflow-y-auto', className)} {...props} />
}
