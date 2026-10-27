import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { t } from '@/lib/i18n'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  /** Monta o search da URL para cada aba: a aba ativa fica no link e é compartilhável. */
  search: (value: T) => Record<string, string | undefined>
  layoutId: string
}

export function Tabs<T extends string>({ items, value, search, layoutId }: TabsProps<T>) {
  return (
    <nav
      aria-label={t('Seções')}
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <Link
            key={item.value}
            to="."
            search={search(item.value)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-[13px] whitespace-nowrap transition-colors',
              active ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="font-mono text-[11px] text-fg-subtle">{item.count}</span>
            )}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-1 -bottom-px h-0.5 bg-accent"
                transition={{ type: 'spring', stiffness: 600, damping: 45 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
