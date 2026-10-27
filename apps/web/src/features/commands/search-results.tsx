import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { CalendarDays, CircleDot, GitPullRequest, StickyNote } from 'lucide-react'
import { useCalendarEvents } from '@/features/calendar/use-calendar-events'
import { notesQuery } from '@/features/notes/queries'
import { dashboardQuery } from '@/features/work/queries'
import { addDaysToKey, dateKey, eventSpan, formatTime } from '@/lib/calendar-dates'
import { LOCALE, t } from '@/lib/i18n'

const dayFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })

/** Itens por grupo: a paleta é para achar, não para listar tudo. */
const LIMIT = 6

const matches = (query: string, ...fields: (string | null | undefined)[]) => {
  const terms = query.toLocaleLowerCase(LOCALE).split(/\s+/).filter(Boolean)
  const haystack = fields.join(' ').toLocaleLowerCase(LOCALE)
  return terms.every((term) => haystack.includes(term))
}

/** Os próximos primeiro, do mais perto ao mais longe; depois os passados, do mais recente. */
function byNearest(a: string, b: string, today: string): number {
  const aPast = a < today
  const bPast = b < today
  if (aPast !== bPast) return aPast ? 1 : -1
  return aPast ? b.localeCompare(a) : a.localeCompare(b)
}

/**
 * Busca em tudo o que já está no app: PRs e issues do painel, notas e a
 * agenda de um mês para trás a dois para frente. Nada vai ao GitHub a cada
 * tecla; os dados vêm do cache das páginas.
 */
export function SearchResults({
  query,
  itemClass,
  run,
}: {
  query: string
  itemClass: string
  run: (action: () => void) => void
}) {
  const navigate = useNavigate()
  const today = dateKey(new Date())
  const dashboard = useQuery(dashboardQuery).data
  const notes = useQuery(notesQuery()).data ?? []
  const events =
    useCalendarEvents({ from: addDaysToKey(today, -30), to: addDaysToKey(today, 60) }).data
      ?.events ?? []

  const seen = new Set<string>()
  const pullRequests = [
    ...(dashboard?.pullRequests.reviewRequested ?? []),
    ...(dashboard?.pullRequests.authored ?? []),
    ...(dashboard?.pullRequests.merged ?? []),
  ]
    .filter((pr) => !seen.has(pr.url) && seen.add(pr.url))
    .filter((pr) => matches(query, pr.title, pr.repository, `#${pr.number}`))
    .slice(0, LIMIT)
  const issues = (dashboard?.issues ?? [])
    .filter((issue) => matches(query, issue.title, issue.repository, `#${issue.number}`))
    .slice(0, LIMIT)
  const foundNotes = notes
    .filter((note) => matches(query, note.title, note.body, note.tags.join(' ')))
    .slice(0, LIMIT)
  const foundEvents = events
    .filter((event) => matches(query, event.title, event.description, event.external?.calendar))
    .sort((a, b) => byNearest(eventSpan(a).first, eventSpan(b).first, today))
    .slice(0, LIMIT)

  // O valor de cada item leva a busca junto: o filtro do cmdk deixa todos passarem.
  const value = (id: string) => `${id} ${query}`

  return (
    <>
      {pullRequests.length > 0 && (
        <Command.Group heading="Pull requests">
          {pullRequests.map((pr) => (
            <Command.Item
              key={pr.url}
              value={value(pr.url)}
              onSelect={() => run(() => window.open(pr.url, '_blank', 'noopener'))}
              className={itemClass}
            >
              <GitPullRequest />
              <span className="min-w-0 flex-1 truncate">{pr.title}</span>
              <span className="shrink-0 font-mono text-[11px] text-fg-subtle">
                {pr.repository}#{pr.number}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
      )}

      {issues.length > 0 && (
        <Command.Group heading="Issues">
          {issues.map((issue) => (
            <Command.Item
              key={issue.url}
              value={value(issue.url)}
              onSelect={() => run(() => window.open(issue.url, '_blank', 'noopener'))}
              className={itemClass}
            >
              <CircleDot />
              <span className="min-w-0 flex-1 truncate">{issue.title}</span>
              <span className="shrink-0 font-mono text-[11px] text-fg-subtle">
                {issue.repository}#{issue.number}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
      )}

      {foundNotes.length > 0 && (
        <Command.Group heading={t('Notas')}>
          {foundNotes.map((note) => (
            <Command.Item
              key={note.id}
              value={value(`nota ${note.id}`)}
              onSelect={() => run(() => void navigate({ to: '/notas', search: { nota: note.id } }))}
              className={itemClass}
            >
              <StickyNote />
              <span className="min-w-0 flex-1 truncate">{note.title || t('Sem título')}</span>
              {note.tags.length > 0 && (
                <span className="shrink-0 text-[11px] text-fg-subtle">
                  {note.tags.slice(0, 2).join(', ')}
                </span>
              )}
            </Command.Item>
          ))}
        </Command.Group>
      )}

      {foundEvents.length > 0 && (
        <Command.Group heading={t('Agenda')}>
          {foundEvents.map((event) => {
            const day = eventSpan(event).first
            return (
              <Command.Item
                key={`${event.id}-${day}`}
                value={value(`evento ${event.id} ${day}`)}
                onSelect={() =>
                  run(() => void navigate({ to: '/calendario', search: { mes: day.slice(0, 7) } }))
                }
                className={itemClass}
              >
                <CalendarDays />
                <span className="min-w-0 flex-1 truncate">{event.title}</span>
                <span className="shrink-0 text-[11px] text-fg-subtle">
                  {dayFormat.format(new Date(`${day}T12:00:00`))}
                  {!event.allDay && event.startsAt && ` · ${formatTime(event.startsAt)}`}
                </span>
              </Command.Item>
            )
          })}
        </Command.Group>
      )}
    </>
  )
}
