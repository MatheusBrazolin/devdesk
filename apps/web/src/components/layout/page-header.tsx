import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fadeUp } from '@/lib/motion'
import { NAV_ITEMS, type NavItem } from '@/lib/navigation'

interface PageHeaderProps {
  /** Seção da navegação: dá o título. */
  section: NavItem['to']
  subtitle?: ReactNode
  /** Controles à direita (filtros de data, sincronizar, criar). */
  actions?: ReactNode
  className?: string
}

/** Cabeçalho comum das páginas: título grande e subtítulo, como a saudação do Hoje. */
export function PageHeader({ section, subtitle, actions, className }: PageHeaderProps) {
  const item = NAV_ITEMS.find((nav) => nav.to === section)!
  return (
    <motion.header
      {...fadeUp(0)}
      className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}
    >
      <div className="min-w-0">
        <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[36px]">
          {item.label}
        </h1>
        {subtitle && <p className="mt-2 max-w-3xl text-[15px] text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  )
}

/** Bloco que entra em sequência depois do cabeçalho. */
export function Reveal({
  delay = 0.06,
  className,
  children,
}: {
  delay?: number
  className?: string
  children: ReactNode
}) {
  return (
    <motion.div {...fadeUp(delay)} className={className}>
      {children}
    </motion.div>
  )
}
