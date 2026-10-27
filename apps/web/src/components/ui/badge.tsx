import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Etiqueta de situação do Quadro: pílula com borda e texto na cor do estado. */
const badgeVariants = cva(
  'inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[12px] leading-none font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-border-strong text-fg-muted',
        accent: 'border-accent text-accent',
        success: 'border-success text-success',
        danger: 'border-danger text-danger',
        warning: 'border-warning text-warning',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
