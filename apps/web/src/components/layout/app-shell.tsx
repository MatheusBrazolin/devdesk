import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useReminderToasts } from '@/features/calendar/use-reminder-toasts'
import { CommandPaletteProvider } from '@/features/commands/command-palette'
import { useGoToShortcuts } from '@/features/commands/use-go-to-shortcuts'
import { useListKeys } from '@/features/commands/use-list-keys'
import { useFocusAlarm } from '@/features/focus/focus-timer'
import { useDashboardSync } from '@/features/work/dashboard-sync'
import { useWorkNotifications } from '@/features/work/use-work-notifications'
import { WelcomeTour } from '@/features/onboarding/welcome-tour'
import { ShortcutsHelp } from '@/features/commands/shortcuts-help'
import { t } from '@/lib/i18n'
import { syncPushLocale } from '@/lib/push'
import { useDocumentTitle } from '@/lib/use-document-title'
import { useUpdateCheck } from '@/lib/update-check'
import { TopBar } from './top-bar'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useGoToShortcuts()
  useListKeys()
  useReminderToasts()
  useWorkNotifications()
  useFocusAlarm()
  useUpdateCheck()
  useDashboardSync()
  useDocumentTitle(pathname)
  // Trocar de idioma recarrega a página: aqui os avisos com o app fechado pegam o idioma e o fuso novos.
  useEffect(() => void syncPushLocale(), [])
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
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-10 sm:py-8 desk:h-dvh desk:min-h-0 desk:gap-6 desk:overflow-hidden desk:py-6">
        <a
          href="#conteudo"
          className="sr-only rounded-md bg-accent px-3 py-2 text-[13px] font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          {t('Pular para o conteúdo')}
        </a>
        <TopBar focus={focus} />
        <motion.main
          id="conteudo"
          tabIndex={-1}
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="min-w-0 flex-1 outline-none desk:flex desk:min-h-0 desk:flex-col"
        >
          <Outlet />
        </motion.main>
      </div>
      <WelcomeTour />
      <ShortcutsHelp />
    </CommandPaletteProvider>
  )
}
