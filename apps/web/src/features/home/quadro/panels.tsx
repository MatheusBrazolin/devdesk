import type { PullRequest, Issue } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useCalendarEvents } from '@/features/calendar/use-calendar-events'
import { notesQuery } from '@/features/notes/queries'
import { addDaysToKey, compareEvents, eventSpan, formatTime, fromKey } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { LOCALE, t } from '@/lib/i18n'
import { useToday } from '@/lib/use-today'
import { loadByOwner } from '../dashboard-metrics'
import { ageRows } from './board'
import { EmptyLine } from './board-view'

const AGE_LABELS = [t('até 1 dia'), t('2 a 14 dias'), t('mais de 14 dias')]
const dayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric' })

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-q-panel border border-q-line bg-q-col p-5"
    >
      <h2 className="text-[15px] font-semibold text-q-text">{title}</h2>
      {children}
    </section>
  )
}

const Count = ({ value, className }: { value: number; className?: string }) => (
  <span className={cn('font-quadro-mono text-[14px]', className)}>{value}</span>
)

/** Seus PRs abertos pela idade; mais de 14 dias em amarelo quando tem algum. */
export function AgePanel({ authored }: { authored: PullRequest[] | null }) {
  return (
    <Panel title={t('Idade dos seus PRs')}>
      {authored === null ? (
        <EmptyLine>{t('Carregando')}</EmptyLine>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {ageRows(authored).map((row, index) => (
            <li
              key={AGE_LABELS[index]}
              className={cn(
                'flex items-center justify-between gap-3 text-[14px]',
                row.count === 0 ? 'text-q-text3' : row.warn ? 'text-q-sun' : 'text-q-text2',
              )}
            >
              <span>{AGE_LABELS[index]}</span>
              <Count value={row.count} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** PRs e issues abertos por organização, com barra proporcional à maior. */
export function OwnersPanel({
  authored,
  issues,
}: {
  authored: PullRequest[] | null
  issues: Issue[] | null
}) {
  const owners = authored && issues ? loadByOwner(authored, issues).slice(0, 5) : null
  const max = Math.max(...(owners ?? []).map((o) => o.pullRequests + o.issues), 1)
  return (
    <Panel title={t('Abertos por organização')}>
      {owners === null ? (
        <EmptyLine>{t('Carregando')}</EmptyLine>
      ) : owners.length === 0 ? (
        <EmptyLine>{t('Nada aberto.')}</EmptyLine>
      ) : (
        <ul className="flex flex-col gap-3">
          {owners.map((owner) => {
            const total = owner.pullRequests + owner.issues
            return (
              <li key={owner.owner} className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between gap-3 text-[14px] text-q-text2">
                  <span className="truncate">{owner.owner}</span>
                  <Count value={total} className="text-q-text" />
                </span>
                <span aria-hidden className="h-1.5 w-full rounded-full bg-q-card">
                  <span
                    className="block h-full rounded-full bg-q-accent"
                    style={{ width: `${(total / max) * 100}%` }}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

const MAX_ITEMS = 3

/** Os próximos compromissos e as notas fixadas, em poucas linhas. */
export function AgendaNotesPanel() {
  const today = useToday()
  const events = useCalendarEvents({ from: today, to: addDaysToKey(today, 6) }).data?.events ?? null
  const notes = useQuery(notesQuery()).data
  const upcoming = (events ?? [])
    .filter((event) => eventSpan(event).last >= today)
    .sort(compareEvents)
    .slice(0, MAX_ITEMS)
  const pinned = (notes ?? []).filter((note) => note.pinned).slice(0, MAX_ITEMS)

  return (
    <Panel title={t('Agenda e notas')}>
      <div className="flex flex-col gap-2">
        {events === null ? (
          <EmptyLine>{t('Carregando')}</EmptyLine>
        ) : upcoming.length === 0 ? (
          <EmptyLine>{t('Nada marcado nos próximos 7 dias.')}</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((event) => {
              const day = eventSpan(event).first
              return (
                <li key={`${event.id}-${day}`}>
                  <Link
                    to="/calendario"
                    search={{ mes: day.slice(0, 7) }}
                    className="q-ease flex items-baseline gap-3 rounded-sm text-[14px] text-q-text2 hover:text-q-text"
                  >
                    <span className="w-[7.5rem] shrink-0 font-quadro-mono text-[12px] whitespace-nowrap text-q-text3">
                      {day === today ? t('hoje') : dayFormat.format(fromKey(day))}
                      {!event.allDay && ` ${formatTime(event.startsAt)}`}
                    </span>
                    <span className="truncate">{event.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-q-line pt-4">
        {notes === undefined ? (
          <EmptyLine>{t('Carregando')}</EmptyLine>
        ) : pinned.length === 0 ? (
          <EmptyLine>{t('Nenhuma nota fixada.')}</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-2">
            {pinned.map((note) => (
              <li key={note.id}>
                <Link
                  to="/notas"
                  search={{ nota: note.id }}
                  className="q-ease block truncate rounded-sm text-[14px] text-q-text2 hover:text-q-text"
                >
                  {note.title || t('Sem título')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
