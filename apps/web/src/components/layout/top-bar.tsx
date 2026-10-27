import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Logo } from '@/components/ui/logo'
import { UserMenu } from './user-menu'
import { meQuery } from '@/features/auth/queries'
import { useCommandPalette } from '@/features/commands/command-palette'
import { cn } from '@/lib/cn'
import { t } from '@/lib/i18n'
import { NAV_ITEMS } from '@/lib/navigation'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/**
 * Barra superior do Quadro, em todas as páginas: logo, navegação em pílula,
 * busca (abre o ⌘K) e o avatar com o menu da conta. No modo foco, a
 * navegação sai da frente; a saída é o botão da própria página.
 */
export function TopBar({ focus = false }: { focus?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { user } = useSuspenseQuery(meQuery).data
  const palette = useCommandPalette()
  const items = NAV_ITEMS.filter((item) => !item.hiddenFromSidebar)
  const navRef = useRef<HTMLUListElement>(null)

  // No celular a pílula rola de lado: a página atual sempre fica à vista.
  useEffect(() => {
    const list = navRef.current
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !active) return
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-q-logo">
        <Logo />
        {user.isDemo && (
          <span
            title={t('Dados de exemplo; nenhuma conta real conectada')}
            className="rounded-full border border-q-line px-2 py-0.5 text-[12px] text-q-text2"
          >
            {t('demonstração')}
          </span>
        )}
      </Link>

      {/* No celular a pílula rola de lado dentro dela mesma; a página nunca. */}
      {!focus && (
        <nav
          aria-label={t('Navegação principal')}
          className="order-last w-full min-w-0 min-[1400px]:order-none min-[1400px]:w-auto min-[1400px]:flex-1"
        >
          <ul
            ref={navRef}
            className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-q-line bg-q-col p-1 [scrollbar-width:none]"
          >
            {items.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
              return (
                <li key={item.to} className="shrink-0">
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'q-ease flex h-9 items-center rounded-full px-4 text-[14px] whitespace-nowrap',
                      active
                        ? 'bg-q-lime font-semibold text-q-on-lime'
                        : 'text-q-text2 hover:bg-q-card hover:text-q-text',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      <div
        className={cn('ml-auto flex shrink-0 items-center gap-3', !focus && 'min-[1400px]:ml-0')}
      >
        <button
          type="button"
          onClick={palette.open}
          className="q-ease flex size-10 items-center justify-center gap-2 rounded-full border border-q-line bg-q-col text-[14px] text-q-text3 hover:text-q-text2 sm:w-[220px] sm:justify-start sm:px-4"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only sm:not-sr-only sm:flex-1 sm:truncate sm:text-left">
            {t('Ir para…')}
          </span>
          <span aria-hidden className="hidden font-quadro-mono text-[12px] sm:block">
            {isMac ? '⌘K' : 'Ctrl K'}
          </span>
        </button>
        <UserMenu variant="avatar" />
      </div>
    </header>
  )
}
