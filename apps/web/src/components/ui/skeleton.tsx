import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Bloco de carregamento. Quem usa dá o tamanho; a forma e o brilho vêm daqui. */
export function Skeleton({ className, ...props }: ComponentProps<'span'>) {
  return <span aria-hidden className={cn('skeleton block', className)} {...props} />
}
