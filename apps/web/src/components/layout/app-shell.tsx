import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useReminderToasts } from '@/features/calendar/use-reminder-toasts'
import { CommandPaletteProvider } from '@/features/commands/command-palette'
import { useGoToShortcuts } from '@/features/commands/use-go-to-shortcuts'
import { useFocusAlarm } from '@/features/focus/focus-timer'
import { useDashboardSync } from '@/features/work/dashboard-sync'
import { useWorkNotifications } from '@/features/work/use-work-notifications'
import { WelcomeTour } from '@/features/onboarding/welcome-tour'
import { ShortcutsHelp } from '@/features/commands/shortcuts-help'
import { useUpdateCheck } from '@/lib/update-check'
import { TopBar } from './top-bar'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useGoToShortcuts()
  useReminderToasts()
  useWorkNotifications()
  useFocusAlarm()
  useUpdateCheck()
  useDashboardSync()
  const focus = pathname === '/foco'

  // No modo TV a página ocupa a tela inteira: sem barra nem margens.
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
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-10 sm:py-8">
        <TopBar focus={focus} />
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="min-w-0 flex-1"
        >
          <Outlet />
        </motion.main>
      </div>
      <WelcomeTour />
      <ShortcutsHelp />
    </CommandPaletteProvider>
  )
}
