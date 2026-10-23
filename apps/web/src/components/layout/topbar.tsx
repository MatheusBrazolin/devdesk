import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Kbd } from '@/components/ui/kbd'
import { meQuery } from '@/features/auth/queries'
import { useCommandPalette } from '@/features/commands/command-palette'
import { NAV_ITEMS } from '@/lib/navigation'
import { MobileNav } from './mobile-nav'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const current = NAV_ITEMS.find((item) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
  )
  const { user } = useSuspenseQuery(meQuery).data
  const palette = useCommandPalette()

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur sm:px-6">
      <MobileNav />
      <span className="text-[13px] font-medium">{current?.label}</span>
      {user.isDemo && (
        <Badge tone="accent" title="Dados de exemplo; nenhuma conta real conectada">
          demonstração
        </Badge>
      )}

      <button
        type="button"
        onClick={palette.open}
        className="ml-auto flex h-7 w-full max-w-60 items-center gap-2 rounded-md border border-border bg-surface px-2 text-[13px] text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Ir para…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
    </header>
  )
}
