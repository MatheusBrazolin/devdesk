import * as Dialog from '@radix-ui/react-dialog'
import { CalendarSync, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime, fromKey } from '@/lib/calendar-dates'
import type { AgendaEvent } from './use-calendar-events'
import { LOCALE, t } from '@/lib/i18n'

const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function when(event: AgendaEvent): string {
  if (event.allDay) {
    const first = dayFormat.format(fromKey(event.date))
    return event.endDate
      ? t('{inicio} a {fim}', { inicio: first, fim: dayFormat.format(fromKey(event.endDate)) })
      : first
  }
  const start = new Date(event.startsAt)
  const time = event.endsAt
    ? t('{inicio} às {fim}', { inicio: formatTime(event.startsAt), fim: formatTime(event.endsAt) })
    : formatTime(event.startsAt)
  return `${dayFormat.format(start)}, ${time}`
}

/** Evento de agenda assinada: só mostra. Mudar, só lá no Google, Outlook ou iCloud. */
export function ExternalEventDialog({
  event,
  onClose,
}: {
  event: AgendaEvent | null
  onClose: () => void
}) {
  return (
    <Dialog.Root open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-border bg-surface shadow-pop animate-pop-in">
          {event && (
            <>
              <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                <Dialog.Title className="text-sm font-semibold">{event.title}</Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label={t('Fechar')} className="-mt-1">
                    <X />
                  </Button>
                </Dialog.Close>
              </header>
              <div className="space-y-2 px-4 py-3 text-[13px]">
                <p className="first-letter:uppercase">{when(event)}</p>
                {event.external?.location && (
                  <p className="flex items-center gap-1.5 text-fg-muted">
                    <MapPin className="size-3.5 shrink-0" /> {event.external.location}
                  </p>
                )}
                <Dialog.Description className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
                  <CalendarSync className="size-3.5 shrink-0" />
                  {event.external?.calendar} · {t('só leitura')}
                </Dialog.Description>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
