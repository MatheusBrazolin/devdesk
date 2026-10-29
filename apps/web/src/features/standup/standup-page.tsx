import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Copy,
  ListChecks,
  NotebookPen,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { useCalendarEvents } from '@/features/calendar/use-calendar-events'
import { useCreateNote } from '@/features/notes/queries'
import { DashboardError, ListSkeleton } from '@/features/work/list-states'
import { addDaysToKey, compareEvents, dateKey, fromKey, occursOn } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { formatStandup, sinceTitle, type StandupFormat } from './format'
import { standupQuery } from './queries'
import { StandupSection as Section } from './standup-section'
import { previousWorkday, windowForDay } from './standup-window'
import { HOUR_STYLE, LOCALE, t } from '@/lib/i18n'

const route = getRouteApi('/app/standup')
const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const FORMATS: { value: StandupFormat; label: string }[] = [
  { value: 'slack', label: 'Slack' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'texto', label: t('Texto') },
]

export function StandupPage() {
  const { dia } = route.useSearch()
  const navigate = route.useNavigate()
  const today = dateKey(new Date())
  const window = dia ? windowForDay(dia) : previousWorkday()
  const sinceIsYesterday = window.first === window.last && window.first === addDaysToKey(today, -1)
  const sinceLabel =
    window.first === window.last
      ? dayFormat.format(fromKey(window.first))
      : t('{inicio} a {fim}', {
          inicio: dayFormat.format(fromKey(window.first)),
          fim: dayFormat.format(fromKey(window.last)),
        })

  const standup = useQuery(standupQuery(window.from, window.to))
  const calendar = useCalendarEvents({ from: today, to: today })
  const events = (calendar.data?.events ?? [])
    .filter((event) => occursOn(event, today))
    .sort(compareEvents)

  const [format, setFormat] = useState<StandupFormat>('slack')
  const generated = standup.data
    ? formatStandup({ sinceLabel, sinceIsYesterday, ...standup.data, events }, format)
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
      toast.success(t('Standup copiado'))
    } catch {
      // Sem acesso à área de transferência: deixa o texto selecionado para um ⌘C.
      const field = document.querySelector<HTMLTextAreaElement>(
        `textarea[aria-label="${t('Texto do standup')}"]`,
      )
      field?.focus()
      field?.select()
      toast.error(t('Não deu para copiar sozinho'), {
        description: t('O texto está selecionado: aperte ⌘C.'),
      })
    }
  }

  return (
    <div className="flex flex-col gap-5 desk:h-full desk:min-h-0">
      <PageHeader
        section="/standup"
        subtitle={t(
          'O que você fez, o que vem hoje e o que está travado, a partir do GitHub e da agenda.',
        )}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('Dia anterior')}
              onClick={() => goToDay(addDaysToKey(window.first, -1))}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-40 text-center text-[13px] font-medium first-letter:uppercase">
              {sinceTitle(sinceLabel, sinceIsYesterday)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('Dia seguinte')}
              disabled={window.last >= addDaysToKey(today, -1)}
              onClick={() => goToDay(addDaysToKey(window.last, 1))}
            >
              <ChevronRight />
            </Button>
            {dia && (
              <Button variant="outline" size="sm" onClick={() => goToDay(undefined)}>
                {t('Dia útil anterior')}
              </Button>
            )}
          </div>
        }
      />

      {standup.data?.isSample && (
        <Badge tone="accent" className="w-fit">
          {t('dados de exemplo')}
        </Badge>
      )}

      <Reveal
        delay={0.06}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] desk:min-h-0 desk:flex-1 desk:grid-rows-[minmax(0,1fr)]"
      >
        <Card className="flex flex-col overflow-hidden desk:min-h-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-3.5 shrink-0 text-success" strokeWidth={2} />
              {t('Resumo')}
            </CardTitle>
          </CardHeader>
          {standup.isPending ? (
            <ListSkeleton rows={5} />
          ) : standup.isError ? (
            <DashboardError error={standup.error} onRetry={() => void standup.refetch()} />
          ) : (
            <div className="scroll-thin divide-y divide-border desk:min-h-0 desk:flex-1 desk:overflow-y-auto">
              <Section
                title={sinceTitle(sinceLabel, sinceIsYesterday)}
                items={standup.data.done}
                empty={t('Nada registrado no GitHub.')}
              />
              <Section
                title={t('Hoje')}
                items={standup.data.today}
                empty={events.length ? null : t('Sem pendências no GitHub nem eventos na agenda.')}
                extra={events.map((event) => (
                  <li key={event.id} className="flex items-center gap-2 text-[13px]">
                    <CalendarDays className="size-3.5 shrink-0 text-fg-subtle" />
                    <span className="font-mono text-[11px] text-fg-subtle">
                      {event.allDay
                        ? t('dia todo')
                        : new Date(event.startsAt).toLocaleTimeString(LOCALE, {
                            hour: HOUR_STYLE,
                            minute: '2-digit',
                          })}
                    </span>
                    <span className="truncate">{event.title}</span>
                  </li>
                ))}
              />
              <Section title={t('Bloqueios')} items={standup.data.blockers} empty={t('Nenhum.')} />
            </div>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden desk:min-h-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCopy className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
              {t('Texto para colar')}
            </CardTitle>
            <div
              role="radiogroup"
              aria-label={t('Formato')}
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
            aria-label={t('Texto do standup')}
            spellCheck={false}
            className="scroll-thin min-h-72 flex-1 resize-none desk:min-h-0 bg-transparent px-4 py-3 font-mono text-[12px] leading-relaxed focus-visible:outline-offset-[-2px]"
          />
          <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            <Button onClick={() => void copy()} disabled={!text}>
              <Copy /> {t('Copiar')}
            </Button>
            <Button
              variant="outline"
              disabled={!text || createNote.isPending}
              onClick={() =>
                createNote.mutate(
                  {
                    title: t('Standup de {data}', { data: dayFormat.format(new Date()) }),
                    body: text,
                    tags: ['standup'],
                  },
                  {
                    onSuccess: () =>
                      toast.success(t('Salvo nas notas'), { icon: <Check className="size-4" /> }),
                  },
                )
              }
            >
              <NotebookPen /> {t('Salvar como nota')}
            </Button>
            {edited && (
              <Button variant="ghost" onClick={() => setDraft(null)} className="ml-auto">
                <RotateCcw /> {t('Gerar de novo')}
              </Button>
            )}
          </footer>
        </Card>
      </Reveal>
    </div>
  )
}
