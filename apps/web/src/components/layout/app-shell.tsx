import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { CommandPaletteProvider } from '@/features/commands/command-palette'
import { useGoToShortcuts } from '@/features/commands/use-go-to-shortcuts'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useGoToShortcuts()

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
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
