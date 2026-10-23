import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex h-5 items-center gap-1 rounded px-1.5 font-mono text-[11px] leading-none',
  {
    variants: {
      tone: {
        neutral: 'border border-border text-fg-muted',
        accent: 'bg-accent-soft text-accent',
        success: 'bg-success/10 text-success',
        danger: 'bg-danger/10 text-danger',
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
