import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: ReactNode
  className?: string
  children?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div role="status" className={cn('flex flex-col items-start px-4 py-6', className)}>
      <Icon className="mb-3 size-4 text-fg-subtle" strokeWidth={1.75} />
      <p className="text-[13px] font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-fg-muted">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
