import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useReminderToasts } from '@/features/calendar/use-reminder-toasts'
import { CommandPaletteProvider } from '@/features/commands/command-palette'
import { useGoToShortcuts } from '@/features/commands/use-go-to-shortcuts'
import { useFocusAlarm } from '@/features/focus/focus-timer'
import { useDashboardSync } from '@/features/work/dashboard-sync'
import { useWorkNotifications } from '@/features/work/use-work-notifications'
import { cn } from '@/lib/cn'
import { useUpdateCheck } from '@/lib/update-check'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useGoToShortcuts()
  useReminderToasts()
  useWorkNotifications()
  useFocusAlarm()
  useUpdateCheck()
  useDashboardSync()
  // No foco, a barra lateral sai da frente: a saída é o botão da própria página.
  const focus = pathname === '/foco'

  // No modo TV a página ocupa a tela inteira: sem barra lateral nem topo.
  // Os avisos continuam valendo (os hooks acima rodam em qualquer rota).
  if (pathname === '/tv') {
    return (
      <CommandPaletteProvider>
        <Outlet />
      </CommandPaletteProvider>
    )
  }

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-dvh">
        {!focus && <Sidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <motion.main
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8',
              // O painel Hoje usa a tela toda; as listas ficam numa largura de leitura.
              pathname === '/' ? 'max-w-[160rem]' : 'max-w-6xl',
            )}
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
