import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fadeUp } from '@/lib/motion'
import { NAV_ITEMS, type NavItem } from '@/lib/navigation'
import { TONE_CHIP } from '@/lib/tones'

interface PageHeaderProps {
  /** Seção da navegação: dá o título, o ícone e a cor. */
  section: NavItem['to']
  subtitle?: ReactNode
  /** Controles à direita (filtros de data, sincronizar, criar). */
  actions?: ReactNode
  className?: string
}

/** Cabeçalho comum das páginas: o mesmo ícone e a mesma cor da barra lateral. */
export function PageHeader({ section, subtitle, actions, className }: PageHeaderProps) {
  const item = NAV_ITEMS.find((nav) => nav.to === section)!
  const Icon = item.icon
  return (
    <motion.header
      {...fadeUp(0)}
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn('grid size-9 shrink-0 place-items-center rounded-lg', TONE_CHIP[item.tone])}
        >
          <Icon className="size-4.5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-semibold">{item.label}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>}
        </div>
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
