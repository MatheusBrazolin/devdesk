import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { CalendarSync, Loader2, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { subscriptionsQuery, useAddSubscription, useRemoveSubscription } from './queries'

const field =
  'h-8 w-full rounded-md border border-border bg-bg px-2.5 text-[13px] focus:border-border-strong focus:outline-none'

const HOW_TO = [
  {
    provider: t('Google Agenda'),
    steps: t('Configurações → sua agenda → "Endereço secreto no formato iCal".'),
  },
  {
    provider: 'Outlook',
    steps: t('Configurações → Calendário → Calendários compartilhados → Publicar → link ICS.'),
  },
  { provider: 'iCloud', steps: t('Compartilhar agenda → Agenda pública → copiar o link.') },
]

/** Conecta agendas de fora pelo link .ics. Só leitura: o DevDesk nunca escreve nelas. */
export function SubscriptionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed top-[10vh] left-1/2 z-50 max-h-[80vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-y-auto rounded-lg border border-border bg-surface shadow-pop animate-pop-in">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="flex items-center gap-2 text-sm font-semibold">
              <CalendarSync className="size-4 text-info" /> {t('Agendas conectadas')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t('Fechar')}>
                <X />
              </Button>
            </Dialog.Close>
          </header>
          <Dialog.Description className="px-4 pt-3 text-[13px] text-fg-muted">
            {t(
              'Suas reuniões do Google Agenda, do Outlook ou do iCloud aparecem no calendário, no Hoje e no modo foco. Só leitura: nada é criado nem alterado lá.',
            )}
          </Dialog.Description>
          {open && <Subscriptions />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Subscriptions() {
  const list = useQuery(subscriptionsQuery)
  const add = useAddSubscription()
  const remove = useRemoveSubscription()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    add.mutate(
      { name: name.trim() || t('Trabalho'), url },
      {
        onSuccess: () => {
          setName('')
          setUrl('')
        },
      },
    )
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {list.data && list.data.subscriptions.length > 0 && (
        <ul
          aria-label={t('Agendas')}
          className="divide-y divide-border rounded-md border border-border"
        >
          {list.data.subscriptions.map((subscription) => (
            <li key={subscription.id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{subscription.name}</span>
                <span className="block text-[11px] text-fg-subtle">{subscription.provider}</span>
              </span>
              {list.data.canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('Desconectar {nome}', { nome: subscription.name })}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(subscription.id)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {list.data && !list.data.canEdit ? (
        <p className="rounded-md border border-border bg-elevated/50 px-3 py-2 text-[13px] text-fg-muted">
          {t(
            'No modo demonstração, uma agenda de exemplo já vem conectada. Entrando com o GitHub, você conecta a sua.',
          )}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[12px] text-fg-muted">{t('Nome')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Trabalho')}
              maxLength={60}
              className={field}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[12px] text-fg-muted">{t('Endereço da agenda (.ics)')}</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
              className={field}
            />
          </label>
          {add.error && (
            <p role="alert" className="text-[13px] text-danger">
              {add.error.message}
            </p>
          )}
          <Button type="submit" disabled={add.isPending || !url.trim()} className="w-full">
            {add.isPending && <Loader2 className="animate-spin" />}
            {t('Conectar agenda')}
          </Button>
          <details className="text-[12px] text-fg-muted">
            <summary className="cursor-pointer select-none hover:text-fg">
              {t('Onde acho esse endereço?')}
            </summary>
            <ul className="mt-2 space-y-1.5">
              {HOW_TO.map((item) => (
                <li key={item.provider}>
                  <span className="font-medium text-fg">{item.provider}:</span> {item.steps}
                </li>
              ))}
              <li>
                {t(
                  'O endereço é secreto: quem tem ele vê a agenda. Aqui ele fica cifrado e não aparece de novo.',
                )}
              </li>
            </ul>
          </details>
        </form>
      )}
    </div>
  )
}
