import * as Dialog from '@radix-ui/react-dialog'
import type { CalendarEvent, Deadline } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Bell, CalendarClock, ChevronLeft, ChevronRight, Download, Flag, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  addDaysToKey,
  compareEvents,
  formatTime,
  fromKey,
  gridRange,
  monthGrid,
  monthKey,
  occursOn,
  parseMonth,
} from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/use-media-query'
import { AgendaList, AgendaSkeleton } from './agenda-list'
import { EventDialog } from './event-dialog'
import { calendarQuery, deadlinesQuery, ICS_URL } from './queries'
import { useToday } from '@/lib/use-today'

const route = getRouteApi('/app/calendario')
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const MAX_CHIPS = 3
const AGENDA_DAYS = 14

export function CalendarPage() {
  const { mes } = route.useSearch()
  const navigate = route.useNavigate()
  const today = useToday()
  const { year, month } = parseMonth(mes)
  const range = gridRange(year, month)
  const calendar = useQuery(calendarQuery(range))
  const deadlines = useQuery(deadlinesQuery(range))
  const agendaRange = { from: today, to: addDaysToKey(today, AGENDA_DAYS - 1) }
  const agenda = useQuery(calendarQuery(agendaRange))
  const agendaDeadlines = useQuery(deadlinesQuery(agendaRange))

  const [dialog, setDialog] = useState<{ event: CalendarEvent | null; day: string } | null>(null)
  // Celular: a grade só tem pontos, então tocar num dia com algo abre a lista dele.
  const [daySheet, setDaySheet] = useState<string | null>(null)
  const eventsOn = (day: string) =>
    calendar.data?.events.filter((event) => occursOn(event, day)).sort(compareEvents) ?? []
  const deadlinesOn = (day: string) => deadlines.data?.deadlines.filter((d) => d.date === day) ?? []
  const small = !useMediaQuery('(min-width: 640px)')
  const openDay = (day: string) => {
    if (small && eventsOn(day).length + deadlinesOn(day).length > 0) setDaySheet(day)
    else setDialog({ event: null, day })
  }
  const goTo = (y: number, m: number) =>
    void navigate({ search: { mes: monthKey(y, m) }, replace: true })

  return (
    <div className="space-y-5">
      <PageHeader
        section="/calendario"
        subtitle="Eventos, lembretes e prazos das milestones do GitHub."
        actions={
          <>
            <a
              href={ICS_URL}
              download
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-[13px] font-medium hover:bg-elevated"
            >
              <Download className="size-4" /> Exportar .ics
            </a>
            <Button onClick={() => setDialog({ event: null, day: today })}>
              <Plus /> Novo evento
            </Button>
          </>
        }
      />

      <Reveal delay={0.04} className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => goTo(year, month - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => goTo(year, month + 1)}
        >
          <ChevronRight />
        </Button>
        <span className="min-w-36 text-sm font-medium first-letter:uppercase" aria-live="polite">
          {monthFormat.format(new Date(year, month, 1, 12))}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigate({ search: {}, replace: true })}
        >
          Hoje
        </Button>
      </Reveal>

      {deadlines.data && !deadlines.data.available && (
        <p
          role="status"
          className="rounded-md border border-border bg-elevated/50 px-3 py-2 text-[13px] text-fg-muted"
        >
          Os prazos das milestones não carregaram (o GitHub não respondeu). Seus eventos estão todos
          aqui.
        </p>
      )}

      <Reveal delay={0.08} className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="py-2 text-center text-[11px] font-medium text-fg-subtle"
              >
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid(year, month)
              .flat()
              .map((day, index) => (
                <DayCell
                  key={day}
                  day={day}
                  inMonth={fromKey(day).getMonth() === month}
                  isToday={day === today}
                  lastColumn={index % 7 === 6}
                  lastRow={index >= 35}
                  events={
                    calendar.data?.events
                      .filter((event) => occursOn(event, day))
                      .sort(compareEvents) ?? []
                  }
                  deadlines={
                    deadlines.data?.deadlines.filter((deadline) => deadline.date === day) ?? []
                  }
                  compact={small}
                  onCreate={() => openDay(day)}
                  onSelect={(event) => setDialog({ event, day })}
                />
              ))}
          </div>
        </Card>

        <Card className="self-start overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-3.5 shrink-0 text-info" strokeWidth={2} />
              Próximos {AGENDA_DAYS} dias
            </CardTitle>
          </CardHeader>
          {agenda.data ? (
            <AgendaList
              from={today}
              days={AGENDA_DAYS}
              events={agenda.data.events}
              deadlines={agendaDeadlines.data?.deadlines ?? []}
              onSelectEvent={(event) => setDialog({ event, day: today })}
              empty="Nada nos próximos dias. Clique num dia do calendário para marcar algo."
            />
          ) : (
            <AgendaSkeleton />
          )}
        </Card>
      </Reveal>

      <DaySheet
        day={daySheet}
        events={daySheet ? eventsOn(daySheet) : []}
        deadlines={daySheet ? deadlinesOn(daySheet) : []}
        onClose={() => setDaySheet(null)}
        onSelect={(event) => {
          setDaySheet(null)
          setDialog({ event, day: daySheet! })
        }}
        onCreate={() => {
          setDaySheet(null)
          setDialog({ event: null, day: daySheet! })
        }}
      />

      <EventDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        event={dialog?.event ?? null}
        day={dialog?.day ?? today}
      />
    </div>
  )
}

interface DayCellProps {
  day: string
  inMonth: boolean
  isToday: boolean
  lastColumn: boolean
  lastRow: boolean
  events: CalendarEvent[]
  deadlines: Deadline[]
  /** Celular: a grade só tem pontos e tocar num dia com algo abre a lista. */
  compact: boolean
  onCreate: () => void
  onSelect: (event: CalendarEvent) => void
}

function DayCell({
  day,
  inMonth,
  isToday,
  lastColumn,
  lastRow,
  events,
  deadlines,
  compact,
  onCreate,
  onSelect,
}: DayCellProps) {
  const items = deadlines.length + events.length
  const hidden = Math.max(0, items - MAX_CHIPS)
  const visibleDeadlines = deadlines.slice(0, MAX_CHIPS)
  const visibleEvents = events.slice(0, MAX_CHIPS - visibleDeadlines.length)

  return (
    <div
      className={cn(
        'group relative min-h-14 border-border p-1 sm:min-h-24 sm:p-1.5',
        !lastColumn && 'border-r',
        !lastRow && 'border-b',
        !inMonth && 'bg-elevated/30',
      )}
    >
      {/* O dia inteiro é o botão de criar; os eventos ficam por cima. */}
      <button
        type="button"
        onClick={onCreate}
        aria-label={dayLabel(day, compact ? items : 0)}
        className="absolute inset-0 hover:bg-elevated/40 focus-visible:bg-elevated/40"
      />
      <span
        className={cn(
          'pointer-events-none relative grid size-6 place-items-center rounded-full font-mono text-[12px]',
          isToday
            ? 'bg-accent font-medium text-primary-fg'
            : inMonth
              ? 'text-fg-muted'
              : 'text-fg-subtle',
        )}
      >
        {fromKey(day).getDate()}
      </span>

      {/* Telas pequenas: só pontos. */}
      {items > 0 && (
        <span className="pointer-events-none relative mt-1 flex gap-0.5 sm:hidden">
          {deadlines.length > 0 && <span className="size-1.5 rounded-full bg-accent" />}
          {events.slice(0, 3).map((event) => (
            <span key={event.id} className="size-1.5 rounded-full bg-fg-muted" />
          ))}
        </span>
      )}

      <ul className="relative mt-1 hidden space-y-0.5 sm:block">
        {visibleDeadlines.map((deadline) => (
          <li key={deadline.id}>
            <a
              href={deadline.url}
              target="_blank"
              rel="noreferrer"
              title={`Prazo da milestone ${deadline.title} (${deadline.repository})`}
              className="flex items-center gap-1 truncate rounded bg-accent-soft px-1 py-0.5 text-[11px] text-accent hover:brightness-95"
            >
              <Flag className="size-3 shrink-0" />
              <span className="truncate">{deadline.title}</span>
            </a>
          </li>
        ))}
        {visibleEvents.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              onClick={() => onSelect(event)}
              className={cn(
                'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-elevated',
                event.allDay ? 'bg-elevated text-fg' : 'text-fg-muted',
              )}
            >
              {event.kind === 'reminder' && <Bell className="size-3 shrink-0 text-accent" />}
              {!event.allDay && (
                <span className="shrink-0 font-mono text-fg-subtle">
                  {formatTime(event.startsAt)}
                </span>
              )}
              <span className="truncate">{event.title}</span>
            </button>
          </li>
        ))}
        {hidden > 0 && <li className="px-1 text-[11px] text-fg-subtle">+{hidden} mais</li>}
      </ul>
    </div>
  )
}

function DaySheet({
  day,
  events,
  deadlines,
  onClose,
  onSelect,
  onCreate,
}: {
  day: string | null
  events: CalendarEvent[]
  deadlines: Deadline[]
  onClose: () => void
  onSelect: (event: CalendarEvent) => void
  onCreate: () => void
}) {
  return (
    <Dialog.Root open={day !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-border bg-surface p-4 shadow-pop animate-pop-in">
          <Dialog.Title className="text-sm font-semibold first-letter:uppercase">
            {day &&
              fromKey(day).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
          </Dialog.Title>
          <Dialog.Description className="sr-only">Eventos e prazos do dia</Dialog.Description>
          <ul className="mt-3 space-y-1">
            {deadlines.map((deadline) => (
              <li key={deadline.id}>
                <a
                  href={deadline.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-[13px] hover:bg-elevated"
                >
                  <Flag className="size-4 shrink-0 text-accent" />
                  Prazo: {deadline.title}
                </a>
              </li>
            ))}
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] hover:bg-elevated"
                >
                  {event.kind === 'reminder' ? (
                    <Bell aria-label="lembrete" className="size-4 shrink-0 text-accent" />
                  ) : (
                    <span className="w-11 shrink-0 font-mono text-[11px] text-fg-subtle">
                      {event.allDay ? 'dia todo' : formatTime(event.startsAt)}
                    </span>
                  )}
                  <span className="truncate">{event.title}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-3 w-full" onClick={onCreate}>
            <Plus /> Novo evento neste dia
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** O que o botão do dia faz, dito do jeito que acontece: criar ou ver a lista. */
function dayLabel(day: string, listed: number): string {
  const date = fromKey(day).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  if (listed === 0) return `Novo evento em ${date}`
  return `${date}: ver ${listed === 1 ? '1 item' : `${listed} itens`}`
}
