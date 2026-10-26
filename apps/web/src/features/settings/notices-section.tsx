import { NOTICE_KINDS, type Settings } from '@devdesk/shared'
import { useState } from 'react'
import { toast } from 'sonner'
import { useNotificationsSetting } from '@/lib/notifications'
import { NOTICE_LABELS, useSaveSettings } from './queries'

/** Liga e desliga cada tipo de aviso. Vale com o app aberto e com ele fechado. */
export function NoticesSection({ settings }: { settings: Settings }) {
  const save = useSaveSettings()
  const browser = useNotificationsSetting()

  // Estado local: a caixa muda no clique, sem esperar o servidor.
  const [notifications, setNotifications] = useState(settings.notifications)

  const toggle = (kind: (typeof NOTICE_KINDS)[number], on: boolean) => {
    const previous = notifications
    const next = { ...notifications, [kind]: on }
    setNotifications(next)
    save.mutate(
      { ...settings, notifications: next },
      {
        onError: (error) => {
          setNotifications(previous)
          toast.error('Não salvou', { description: error.message })
        },
      },
    )
  }

  return (
    <div className="px-4 py-3">
      <p className="mb-3 text-[13px] text-fg-muted">
        {browser.enabled
          ? 'As notificações do navegador estão ligadas. Escolha quais avisos chegam:'
          : 'As notificações do navegador estão desligadas (ligue no menu do usuário). Os avisos dentro da página seguem estas escolhas:'}
      </p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {NOTICE_KINDS.map((kind) => (
          <li key={kind}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-elevated/60">
              <input
                type="checkbox"
                checked={notifications[kind]}
                onChange={(event) => toggle(kind, event.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-[13px] font-medium">{NOTICE_LABELS[kind].title}</span>
                <span className="block text-[12px] text-fg-subtle">{NOTICE_LABELS[kind].hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
