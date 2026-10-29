import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { dashboardQuery } from '@/features/work/queries'
import { NAV_ITEMS } from './navigation'

/** "Pull requests · DevDesk": o nome da página no topo da aba e no histórico. */
export function pageTitle(pathname: string, pending = 0): string {
  const item = NAV_ITEMS.find((nav) =>
    nav.to === '/' ? pathname === '/' : pathname.startsWith(nav.to),
  )
  const name = item ? `${item.label} · DevDesk` : 'DevDesk'
  // Reviews esperando por você na frente, como a caixa de entrada faz com os não lidos.
  return pending > 0 ? `(${pending}) ${name}` : name
}

/** Mantém o título da aba em dia com a página e com as reviews pedidas. */
export function useDocumentTitle(pathname: string): void {
  const pending = useQuery({
    ...dashboardQuery,
    select: (data) => data.summary.reviewRequested,
  }).data
  useEffect(() => {
    document.title = pageTitle(pathname, pending)
  }, [pathname, pending])
}
