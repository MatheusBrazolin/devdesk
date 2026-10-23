import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useReminderToasts } from '@/features/calendar/use-reminder-toasts'
import { CommandPaletteProvider } from '@/features/commands/command-palette'
import { useGoToShortcuts } from '@/features/commands/use-go-to-shortcuts'
import { cn } from '@/lib/cn'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useGoToShortcuts()
  useReminderToasts()

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
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
              pathname === '/' ? 'max-w-[100rem]' : 'max-w-6xl',
            )}
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
