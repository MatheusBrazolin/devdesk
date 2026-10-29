import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Bell,
  BellOff,
  ChevronsUpDown,
  Crosshair,
  Download,
  GraduationCap,
  LogOut,
  MessageSquareText,
  Settings,
  Tv,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { meQuery, useLogout } from '@/features/auth/queries'
import {
  disableNotifications,
  enableNotifications,
  useNotificationsSetting,
} from '@/lib/notifications'
import { openWelcomeTour } from '@/features/onboarding/welcome-store'
import { useInstallPrompt } from '@/lib/install'
import { disablePush, enablePush } from '@/lib/push'
import { initials } from '@/lib/greeting'
import { t } from '@/lib/i18n'

/** Menu da conta: na barra lateral, o nome e o login; no Quadro, só o avatar. */
export function UserMenu({ variant = 'sidebar' }: { variant?: 'sidebar' | 'avatar' }) {
  const { user } = useSuspenseQuery(meQuery).data
  const logout = useLogout()
  const notifications = useNotificationsSetting()
  const navigate = useNavigate()
  const installPrompt = useInstallPrompt()

  const toggleNotifications = async () => {
    if (notifications.enabled) {
      disableNotifications()
      return void disablePush()
    }
    if (notifications.permission === 'unsupported') {
      return toast.error(t('Este navegador não mostra notificações.'))
    }
    if (notifications.permission === 'denied') {
      return toast.error(t('O navegador bloqueou as notificações deste site'), {
        description: t('Libere nas configurações do site e tente de novo.'),
      })
    }
    if (!(await enableNotifications())) return
    toast.success(t('Notificações ligadas'), {
      description: (await enablePush())
        ? t('Chegam também com o DevDesk fechado.')
        : t('Chegam enquanto o DevDesk estiver aberto.'),
    })
  }

  return (
    <DropdownMenu>
      {variant === 'avatar' ? (
        // Barra superior do Quadro: só o avatar, com as iniciais e anel lavanda.
        <DropdownMenuTrigger
          data-tour="menu-do-usuario"
          className="q-ease grid size-10 shrink-0 place-items-center rounded-full border-2 border-q-accent bg-q-col text-[14px] font-semibold text-q-text hover:bg-q-card"
        >
          {initials(user.name, user.login)}
          <span className="sr-only">{t('Menu de {nome}', { nome: user.name ?? user.login })}</span>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-elevated data-[state=open]:bg-elevated">
          <Avatar name={user.name} login={user.login} src={user.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">
              {user.name ?? user.login}
            </span>
            <span className="block truncate text-[12px] text-fg-subtle">@{user.login}</span>
          </span>
          <ChevronsUpDown className="size-4 text-fg-subtle" />
        </DropdownMenuTrigger>
      )}

      <DropdownMenuContent
        side={variant === 'avatar' ? 'bottom' : 'top'}
        align={variant === 'avatar' ? 'end' : 'start'}
        className={variant === 'avatar' ? 'w-60' : 'w-[var(--radix-dropdown-menu-trigger-width)]'}
      >
        <DropdownMenuItem onSelect={() => void navigate({ to: '/foco' })}>
          <Crosshair /> {t('Modo foco')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/standup' })}>
          <MessageSquareText /> Standup
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/tv' })}>
          <Tv /> {t('Modo TV')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/configuracoes' })}>
          <Settings /> {t('Configurações')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={openWelcomeTour}>
          <GraduationCap /> {t('Primeiros passos')}
        </DropdownMenuItem>
        {installPrompt.available && (
          <DropdownMenuItem
            onSelect={() =>
              void installPrompt
                .install()
                .then((accepted) => accepted && toast.success(t('DevDesk instalado')))
            }
          >
            <Download /> {t('Instalar app')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void toggleNotifications()}>
          {notifications.enabled ? <BellOff /> : <Bell />}
          {notifications.enabled ? t('Desligar notificações') : t('Ligar notificações')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()}>
          <LogOut /> {t('Sair')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
