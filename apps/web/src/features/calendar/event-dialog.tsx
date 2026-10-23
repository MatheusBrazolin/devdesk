import type { CalendarEvent, CreateEventInput, EventKind } from '@devdesk/shared'
import * as Dialog from '@radix-ui/react-dialog'
import { Bell, CalendarDays, Loader2, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { addDaysToKey, dateKey } from '@/lib/calendar-dates'
import { useDeleteEvent, useSaveEvent } from './queries'

const pad = (n: number) => String(n).padStart(2, '0')
const localTime = (iso: string) => {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface Draft {
  title: string
  description: string
  kind: EventKind
  allDay: boolean
  date: string
  endDate: string
  startTime: string
  endTime: string
}

function draftFrom(event: CalendarEvent | null, day: string): Draft {
  if (!event) {
    return {
      title: '',
      description: '',
      kind: 'event',
      allDay: false,
      date: day,
      endDate: '',
      startTime: '09:00',
      endTime: '',
    }
  }
  const common = { title: event.title, description: event.description, kind: event.kind }
  return event.allDay
    ? {
        ...common,
        allDay: true,
        date: event.date,
        endDate: event.endDate ?? '',
        startTime: '09:00',
        endTime: '',
      }
    : {
        ...common,
        allDay: false,
        date: dateKey(new Date(event.startsAt)),
        endDate: '',
        startTime: localTime(event.startsAt),
        endTime: event.endsAt ? localTime(event.endsAt) : '',
      }
}

/** Data e hora locais viram um instante: "2026-10-26" + "09:30" no fuso de quem preenche. */
const toInstant = (date: string, time: string) => new Date(`${date}T${time}`).toISOString()

function toInput(draft: Draft, event: CalendarEvent | null): CreateEventInput {
  const common = {
    title: draft.title,
    description: draft.description,
    kind: draft.kind,
    link: event?.link ?? null,
  }
  if (draft.allDay)
    return { ...common, allDay: true, date: draft.date, endDate: draft.endDate || null }
  const startsAt = toInstant(draft.date, draft.startTime)
  let endsAt = draft.endTime ? toInstant(draft.date, draft.endTime) : null
  // 23:00 às 01:00: o fim é no dia seguinte, não antes do começo.
  if (endsAt && endsAt <= startsAt) endsAt = toInstant(addDaysToKey(draft.date, 1), draft.endTime)
  return { ...common, allDay: false, startsAt, endsAt }
}

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nulo para um evento novo. */
  event: CalendarEvent | null
  /** Dia sugerido para um evento novo. */
  day: string
}

export function EventDialog({ open, onOpenChange, event, day }: EventDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-border bg-surface shadow-pop animate-pop-in">
          {/* Remontar a cada abertura zera o rascunho. */}
          {open && (
            <EventForm
              key={event?.id ?? day}
              event={event}
              day={day}
              onDone={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EventForm({
  event,
  day,
  onDone,
}: {
  event: CalendarEvent | null
  day: string
  onDone: () => void
}) {
  const [draft, setDraft] = useState(() => draftFrom(event, day))
  const save = useSaveEvent()
  const remove = useDeleteEvent()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: event?.id, input: toInput(draft, event) }, { onSuccess: onDone })
  }

  const field =
    'h-8 w-full rounded-md border border-border bg-bg px-2.5 text-[13px] focus:border-border-strong focus:outline-none'

  return (
    <form onSubmit={submit}>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Dialog.Title className="text-sm font-semibold">
          {event ? 'Editar evento' : 'Novo evento'}
        </Dialog.Title>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon" aria-label="Fechar">
            <X />
          </Button>
        </Dialog.Close>
      </header>

      <div className="space-y-4 px-4 py-4">
        <Dialog.Description className="sr-only">
          Título, data e horário do evento
        </Dialog.Description>
        <input
          autoFocus
          required
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Título"
          aria-label="Título"
          maxLength={200}
          className="w-full bg-transparent text-[15px] font-medium placeholder:text-fg-subtle focus:outline-none"
        />

        <div role="radiogroup" aria-label="Tipo" className="flex gap-1.5">
          {(
            [
              ['event', 'Evento', CalendarDays],
              ['reminder', 'Lembrete', Bell],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={draft.kind === value}
              onClick={() => set('kind', value)}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition-colors',
                draft.kind === value
                  ? 'border-border-strong bg-elevated font-medium text-fg'
                  : 'border-border text-fg-muted hover:text-fg',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <label className="flex w-fit items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={draft.allDay}
            onChange={(e) => set('allDay', e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Dia inteiro
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[12px] text-fg-muted">
              {draft.allDay ? 'Primeiro dia' : 'Dia'}
            </span>
            <input
              type="date"
              required
              value={draft.date}
              onChange={(e) => set('date', e.target.value)}
              className={field}
            />
          </label>
          {draft.allDay ? (
            <label className="space-y-1">
              <span className="text-[12px] text-fg-muted">Último dia (opcional)</span>
              <input
                type="date"
                min={draft.date}
                value={draft.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={field}
              />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[12px] text-fg-muted">Início</span>
                <input
                  type="time"
                  required
                  value={draft.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                  className={field}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[12px] text-fg-muted">Fim</span>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                  className={field}
                />
              </label>
            </div>
          )}
        </div>

        <textarea
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Descrição (opcional)"
          aria-label="Descrição"
          rows={3}
          maxLength={5000}
          className="w-full resize-none rounded-md border border-border bg-bg px-2.5 py-2 text-[13px] placeholder:text-fg-subtle focus:border-border-strong focus:outline-none"
        />

        {event?.link && (
          <a
            href={event.link.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate rounded-md border border-border bg-elevated/40 px-2.5 py-1.5 text-[12px] hover:underline"
          >
            <span className="font-mono text-fg-subtle">
              {event.link.repository}#{event.link.number}
            </span>{' '}
            {event.link.title}
          </a>
        )}

        {save.isError && (
          <p role="alert" className="text-[13px] text-danger">
            {save.error.message}
          </p>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
        {event && (
          <Button
            variant="ghost"
            className="text-danger hover:text-danger"
            disabled={remove.isPending}
            // Dois cliques: o primeiro pede confirmação, o segundo apaga.
            onClick={() =>
              confirmingDelete
                ? remove.mutate(event.id, { onSuccess: onDone })
                : setConfirmingDelete(true)
            }
            onBlur={() => setConfirmingDelete(false)}
          >
            {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {confirmingDelete ? 'Confirmar: apagar' : 'Apagar'}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Dialog.Close asChild>
            <Button variant="outline">Cancelar</Button>
          </Dialog.Close>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </div>
      </footer>
    </form>
  )
}
