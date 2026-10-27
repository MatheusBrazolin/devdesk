import type { Deadline } from '@devdesk/shared'
import { Bell, Flag } from 'lucide-react'
import {
  addDaysToKey,
  compareEvents,
  dateKey,
  formatTime,
  fromKey,
  occursOn,
} from '@/lib/calendar-dates'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import type { AgendaEvent } from './use-calendar-events'
import { LOCALE, plural, t } from '@/lib/i18n'

const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function dayLabel(day: string, today = dateKey(new Date())): string {
  if (day === today) return t('Hoje')
  if (day === addDaysToKey(today, 1)) return t('Amanhã')
  return dayFormat.format(fromKey(day))
}

const TIME_COLUMN = 'mt-px w-14 shrink-0 font-mono text-[11px] whitespace-nowrap text-fg-subtle'

interface AgendaListProps {
  from: string
  days: number
  events: AgendaEvent[]
  deadlines: Deadline[]
  onSelectEvent?: (event: AgendaEvent) => void
  /** Texto quando não há nada no período. */
  empty: string
}

/** Agenda dia a dia: só os dias que têm algo, com eventos e prazos de milestones. */
export function AgendaList({
  from,
  days,
  events,
  deadlines,
  onSelectEvent,
  empty,
}: AgendaListProps) {
  const groups = Array.from({ length: days }, (_, i) => addDaysToKey(from, i))
    .map((day) => ({
      day,
      events: events.filter((event) => occursOn(event, day)).sort(compareEvents),
      deadlines: deadlines.filter((deadline) => deadline.date === day),
    }))
    .filter((group) => group.events.length + group.deadlines.length > 0)

  if (groups.length === 0) return <p className="px-4 py-6 text-[13px] text-fg-muted">{empty}</p>

  return (
    <ol className="divide-y divide-border">
      {groups.map((group) => (
        <li key={group.day} className="px-4 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium text-fg-subtle first-letter:uppercase">
            {dayLabel(group.day)}
          </p>
          <ul className="space-y-1">
            {group.deadlines.map((deadline) => (
              <li key={deadline.id}>
                <a
                  href={deadline.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-elevated/60"
                >
                  <span className={TIME_COLUMN}>{t('prazo')}</span>
                  <Flag className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">
                      {t('Prazo: {titulo}', { titulo: deadline.title })}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-fg-subtle">
                      {deadline.repository} ·{' '}
                      {plural(deadline.items, '{n} item seu', '{n} itens seus')}
                    </span>
                  </span>
                </a>
              </li>
            ))}
            {group.events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent?.(event)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left',
                    onSelectEvent && 'hover:bg-elevated/60',
                  )}
                >
                  <span className={TIME_COLUMN}>
                    {event.allDay ? t('dia todo') : formatTime(event.startsAt)}
                  </span>
                  {/* Ícone sempre no mesmo lugar: os títulos ficam alinhados. */}
                  {event.kind === 'reminder' ? (
                    <Bell
                      aria-label={t('lembrete')}
                      className="mt-0.5 size-3.5 shrink-0 text-accent"
                    />
                  ) : (
                    <span aria-hidden className="grid size-3.5 shrink-0 place-items-center pt-1">
                      {/* Agenda assinada: anel vazado; evento do DevDesk: ponto cheio. */}
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          event.external ? 'ring-[1.5px] ring-info' : 'bg-info',
                        )}
                      />
                    </span>
                  )}
                  <span className="min-w-0 truncate text-[13px]">
                    {event.title}
                    {event.external && (
                      <span className="sr-only">
                        {t(', da agenda {agenda}', { agenda: event.external.calendar })}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

/** Esqueleto com a mesma forma da agenda: rótulo do dia e linhas de evento. */
export function AgendaSkeleton({ days = 3 }: { days?: number }) {
  return (
    <div aria-busy="true" aria-label={t('Carregando')} className="divide-y divide-border">
      {Array.from({ length: days }, (_, index) => (
        <div key={index} className="space-y-2 px-4 py-3">
          <Skeleton className="h-2.5 w-20" />
          <span className="flex items-center gap-2 px-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3" style={{ width: `${60 - index * 12}%` }} />
          </span>
        </div>
      ))}
    </div>
  )
}
