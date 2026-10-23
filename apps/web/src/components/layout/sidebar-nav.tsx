import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from '@/lib/navigation'

/** Lista de navegação. A barra de acento do item ativo desliza entre os itens. */
export function SidebarNav({
  onNavigate,
  layoutId,
}: {
  onNavigate?: () => void
  layoutId: string
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav aria-label="Principal" className="flex flex-col gap-px">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors',
              active
                ? 'bg-elevated font-medium text-fg'
                : 'text-fg-muted hover:bg-elevated/60 hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute top-1.5 bottom-1.5 -left-3 w-0.5 rounded-r bg-accent"
                transition={{ type: 'spring', stiffness: 600, damping: 45 }}
              />
            )}
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
