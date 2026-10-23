import type { StandupItem } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Copy,
  Eye,
  GitMerge,
  GitPullRequest,
  Hourglass,
  NotebookPen,
  RotateCcw,
  type LucideIcon,
  ClipboardCopy,
  ListChecks,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { calendarQuery } from '@/features/calendar/queries'
import { useCreateNote } from '@/features/notes/queries'
import { DashboardError, ListSkeleton } from '@/features/work/list-states'
import { addDaysToKey, compareEvents, dateKey, fromKey, occursOn } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { formatStandup, type StandupFormat } from './format'
import { standupQuery } from './queries'
import { previousWorkday, windowForDay } from './standup-window'

const route = getRouteApi('/app/standup')
const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const FORMATS: { value: StandupFormat; label: string }[] = [
  { value: 'slack', label: 'Slack' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'texto', label: 'Texto' },
]

const ICONS: Record<StandupItem['kind'], LucideIcon> = {
  merged: GitMerge,
  opened: GitPullRequest,
  reviewed: Eye,
  closed_issue: CircleDot,
  review_requested: Eye,
  changes_requested: GitPullRequest,
  ci_failed: GitPullRequest,
  conflict: GitPullRequest,
  ready_to_merge: GitMerge,
  waiting_review: Hourglass,
}

export function StandupPage() {
  const { dia } = route.useSearch()
  const navigate = route.useNavigate()
  const today = dateKey(new Date())
  const window = dia ? windowForDay(dia) : previousWorkday()
  const sinceLabel =
    window.first === window.last
      ? dayFormat.format(fromKey(window.first))
      : `${dayFormat.format(fromKey(window.first))} a ${dayFormat.format(fromKey(window.last))}`

  const standup = useQuery(standupQuery(window.from, window.to))
  const calendar = useQuery(calendarQuery({ from: today, to: today }))
  const events = (calendar.data?.events ?? [])
    .filter((event) => occursOn(event, today))
    .sort(compareEvents)

  const [format, setFormat] = useState<StandupFormat>('slack')
  const generated = standup.data
    ? formatStandup({ sinceLabel, ...standup.data, events }, format)
    : ''
  // Nulo enquanto ninguém editou: o texto acompanha os dados e o formato.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? generated
  const edited = draft !== null

  const createNote = useCreateNote()
  const goToDay = (day: string | undefined) => {
    setDraft(null)
    void navigate({ search: day ? { dia: day } : {}, replace: true })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Standup copiado')
    } catch {
      // Sem acesso à área de transferência: deixa o texto selecionado para um ⌘C.
      const field = document.querySelector<HTMLTextAreaElement>(
        'textarea[aria-label="Texto do standup"]',
      )
      field?.focus()
      field?.select()
      toast.error('Não deu para copiar sozinho', {
        description: 'O texto está selecionado: aperte ⌘C.',
      })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        section="/standup"
        subtitle="O que você fez, o que vem hoje e o que está travado, a partir do GitHub e da agenda."
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Dia anterior"
              onClick={() => goToDay(addDaysToKey(window.first, -1))}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-40 text-center text-[13px] font-medium first-letter:uppercase">
              Ontem: {sinceLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Dia seguinte"
              disabled={window.last >= addDaysToKey(today, -1)}
              onClick={() => goToDay(addDaysToKey(window.last, 1))}
            >
              <ChevronRight />
            </Button>
            {dia && (
              <Button variant="outline" size="sm" onClick={() => goToDay(undefined)}>
                Dia útil anterior
              </Button>
            )}
          </div>
        }
      />

      {standup.data?.isSample && (
        <Badge tone="accent" className="w-fit">
          dados de exemplo
        </Badge>
      )}

      <Reveal
        delay={0.06}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-3.5 shrink-0 text-success" strokeWidth={2} />
              Resumo
            </CardTitle>
          </CardHeader>
          {standup.isPending ? (
            <ListSkeleton rows={5} />
          ) : standup.isError ? (
            <DashboardError error={standup.error} onRetry={() => void standup.refetch()} />
          ) : (
            <div className="divide-y divide-border">
              <Section
                title={`Ontem (${sinceLabel})`}
                items={standup.data.done}
                empty="Nada registrado no GitHub."
              />
              <Section
                title="Hoje"
                items={standup.data.today}
                empty={events.length ? null : 'Sem pendências no GitHub nem eventos na agenda.'}
                extra={events.map((event) => (
                  <li key={event.id} className="flex items-center gap-2 text-[13px]">
                    <CalendarDays className="size-3.5 shrink-0 text-fg-subtle" />
                    <span className="font-mono text-[11px] text-fg-subtle">
                      {event.allDay
                        ? 'dia todo'
                        : new Date(event.startsAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </span>
                    <span className="truncate">{event.title}</span>
                  </li>
                ))}
              />
              <Section title="Bloqueios" items={standup.data.blockers} empty="Nenhum." />
            </div>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCopy className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
              Texto para colar
            </CardTitle>
            <div
              role="radiogroup"
              aria-label="Formato"
              className="flex rounded-md border border-border p-0.5"
            >
              {FORMATS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={format === value}
                  onClick={() => {
                    setFormat(value)
                    setDraft(null)
                  }}
                  className={cn(
                    'h-6 rounded px-2 text-[12px] transition-colors',
                    format === value
                      ? 'bg-elevated font-medium text-fg'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <textarea
            value={text}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Texto do standup"
            spellCheck={false}
            className="min-h-72 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[12px] leading-relaxed focus:outline-none"
          />
          <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            <Button onClick={() => void copy()} disabled={!text}>
              <Copy /> Copiar
            </Button>
            <Button
              variant="outline"
              disabled={!text || createNote.isPending}
              onClick={() =>
                createNote.mutate(
                  {
                    title: `Standup de ${dayFormat.format(new Date())}`,
                    body: text,
                    tags: ['standup'],
                  },
                  {
                    onSuccess: () =>
                      toast.success('Salvo nas notas', { icon: <Check className="size-4" /> }),
                  },
                )
              }
            >
              <NotebookPen /> Salvar como nota
            </Button>
            {edited && (
              <Button variant="ghost" onClick={() => setDraft(null)} className="ml-auto">
                <RotateCcw /> Gerar de novo
              </Button>
            )}
          </footer>
        </Card>
      </Reveal>
    </div>
  )
}

function Section({
  title,
  items,
  empty,
  extra,
}: {
  title: string
  items: StandupItem[]
  empty: string | null
  extra?: ReactNode[]
}) {
  return (
    <section className="px-4 py-3">
      <h2 className="mb-2 text-[12px] font-semibold text-fg-muted first-letter:uppercase">
        {title}
      </h2>
      <ul className="space-y-1.5">
        {extra}
        {items.map((item) => {
          const Icon = ICONS[item.kind]
          return (
            <li key={`${item.kind}-${item.url}`} className="flex items-start gap-2 text-[13px]">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" strokeWidth={1.75} />
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 hover:underline"
              >
                <span className="font-mono text-[11px] text-fg-subtle">
                  {item.repository}#{item.number}
                </span>{' '}
                {item.title}
                {item.detail && <span className="text-fg-subtle"> · {item.detail}</span>}
              </a>
            </li>
          )
        })}
        {items.length === 0 && !extra && empty && (
          <li className="text-[13px] text-fg-subtle">{empty}</li>
        )}
        {items.length === 0 && extra && Array.isArray(extra) && extra.length === 0 && empty && (
          <li className="text-[13px] text-fg-subtle">{empty}</li>
        )}
      </ul>
    </section>
  )
}
