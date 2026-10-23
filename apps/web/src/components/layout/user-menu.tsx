import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Bell, BellOff, ChevronsUpDown, Crosshair, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { meQuery, useLogout } from '@/features/auth/queries'
import {
  disableNotifications,
  enableNotifications,
  useNotificationsSetting,
} from '@/lib/notifications'
import { type ThemePreference, useTheme } from '@/lib/theme'

export function UserMenu() {
  const { user } = useSuspenseQuery(meQuery).data
  const { preference, setPreference } = useTheme()
  const logout = useLogout()
  const notifications = useNotificationsSetting()
  const navigate = useNavigate()

  const toggleNotifications = async () => {
    if (notifications.enabled) return disableNotifications()
    if (notifications.permission === 'unsupported') {
      return toast.error('Este navegador não mostra notificações.')
    }
    if (notifications.permission === 'denied') {
      return toast.error('O navegador bloqueou as notificações deste site', {
        description: 'Libere nas configurações do site e tente de novo.',
      })
    }
    if (await enableNotifications()) toast.success('Notificações ligadas')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-elevated data-[state=open]:bg-elevated">
        <Avatar name={user.name} login={user.login} src={user.avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{user.name ?? user.login}</span>
          <span className="block truncate text-[12px] text-fg-subtle">@{user.login}</span>
        </span>
        <ChevronsUpDown className="size-4 text-fg-subtle" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => setPreference(value as ThemePreference)}
        >
          <DropdownMenuRadioItem value="light">
            <Sun /> Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Escuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: '/foco' })}>
          <Crosshair /> Modo foco
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void toggleNotifications()}>
          {notifications.enabled ? <BellOff /> : <Bell />}
          {notifications.enabled ? 'Desligar notificações' : 'Ligar notificações'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
