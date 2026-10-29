import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardCopy,
  Copy,
  Eye,
  GitMerge,
  GitPullRequest,
  ListChecks,
  NotebookPen,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricTile } from '@/components/ui/metric-tile'
import { useCreateNote } from '@/features/notes/queries'
import type { StandupFormat } from '@/features/standup/format'
import { StandupSection } from '@/features/standup/standup-section'
import { DashboardError, ListSkeleton } from '@/features/work/list-states'
import { addDaysToKey, fromKey } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { formatWeek, weekCounts } from './format'
import { weekQuery } from './queries'
import { currentWeek, weekOf } from './week-window'
import { LOCALE, t } from '@/lib/i18n'

const route = getRouteApi('/app/semana')
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })

const FORMATS: { value: StandupFormat; label: string }[] = [
  { value: 'slack', label: 'Slack' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'texto', label: t('Texto') },
]

/** "20 – 26 de out." ou "Oct 20 – 26": o Intl junta o mês na ordem de cada idioma. */
function weekLabel(first: string, last: string): string {
  return dayMonth.formatRange(fromKey(first), fromKey(last))
}

/**
 * Resumo da semana: o que você entregou, revisou e abriu, e o que está
 * travado agora. Feito para o 1:1 e para a retrospectiva.
 */
export function WeekPage() {
  const { semana } = route.useSearch()
  const navigate = route.useNavigate()
  const thisWeek = currentWeek()
  const week = semana ? weekOf(semana) : thisWeek
  const label = weekLabel(week.first, week.last)
  const isCurrent = week.first === thisWeek.first

  const data = useQuery(weekQuery(week.from, week.to))
  const counts = data.data ? weekCounts(data.data.done) : null
  const done = data.data?.done ?? []
  const blockers = data.data?.blockers ?? []

  const [format, setFormat] = useState<StandupFormat>('slack')
  const generated = data.data ? formatWeek({ label, done, blockers }, format) : ''
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? generated
  const createNote = useCreateNote()

  const goToWeek = (first: string | undefined) => {
    setDraft(null)
    void navigate({ search: first ? { semana: first } : {}, replace: true })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('Resumo copiado'))
    } catch {
      const field = document.querySelector<HTMLTextAreaElement>(
        `textarea[aria-label="${t('Texto do resumo')}"]`,
      )
      field?.focus()
      field?.select()
      toast.error(t('Não deu para copiar sozinho'), {
        description: t('O texto está selecionado: aperte ⌘C.'),
      })
    }
  }

  const value = (n: number | undefined) => (n === undefined ? null : String(n))

  return (
    <div className="flex flex-col gap-5 desk:h-full desk:min-h-0">
      <PageHeader
        section="/semana"
        subtitle={t(
          'O que você entregou, revisou e abriu, e o que está travado. Pronto para o 1:1.',
        )}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('Semana anterior')}
              onClick={() => goToWeek(addDaysToKey(week.first, -7))}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-40 text-center text-[13px] font-medium">{label}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('Semana seguinte')}
              disabled={isCurrent}
              onClick={() => goToWeek(addDaysToKey(week.first, 7))}
            >
              <ChevronRight />
            </Button>
            {!isCurrent && (
              <Button variant="outline" size="sm" onClick={() => goToWeek(undefined)}>
                {t('Esta semana')}
              </Button>
            )}
          </div>
        }
      />

      {data.data?.isSample && (
        <Badge tone="accent" className="w-fit">
          {t('dados de exemplo')}
        </Badge>
      )}

      <Reveal delay={0.03} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          icon={GitMerge}
          tone="merged"
          label={t('Mergeados')}
          value={value(counts?.merged)}
          hint={t('PRs seus que entraram')}
        />
        <MetricTile
          icon={Eye}
          tone="accent"
          label={t('Reviews feitas')}
          value={value(counts?.reviewed)}
          hint={t('PRs de outras pessoas')}
        />
        <MetricTile
          icon={GitPullRequest}
          tone="success"
          label={t('PRs abertos')}
          value={value(counts?.opened)}
          hint={t('começados na semana')}
        />
        <MetricTile
          icon={CircleDot}
          tone="info"
          label={t('Issues fechadas')}
          value={value(counts?.closedIssues)}
          hint={t('atribuídas a você')}
        />
      </Reveal>

      <Reveal
        delay={0.06}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] desk:min-h-0 desk:flex-1 desk:grid-rows-[minmax(0,1fr)]"
      >
        <Card className="flex flex-col overflow-hidden desk:min-h-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-3.5 shrink-0 text-success" strokeWidth={2} />
              {t('O que você fez')}
            </CardTitle>
          </CardHeader>
          {data.isPending ? (
            <ListSkeleton rows={5} />
          ) : data.isError ? (
            <DashboardError error={data.error} onRetry={() => void data.refetch()} />
          ) : (
            <div className="scroll-thin divide-y divide-border desk:min-h-0 desk:flex-1 desk:overflow-y-auto">
              <StandupSection
                title={t('Entregue')}
                items={done.filter(
                  (item) => item.kind === 'merged' || item.kind === 'closed_issue',
                )}
                empty={t('Nada mergeado nem fechado nesta semana.')}
              />
              <StandupSection
                title={t('Revisado')}
                items={done.filter((item) => item.kind === 'reviewed')}
                empty={t('Nenhuma review enviada.')}
              />
              <StandupSection
                title={t('Aberto')}
                items={done.filter((item) => item.kind === 'opened')}
                empty={t('Nenhum PR aberto nesta semana.')}
              />
              <StandupSection
                title={t('Travado agora')}
                items={blockers}
                empty={t('Nada travado.')}
              />
            </div>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden desk:min-h-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCopy className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
              {t('Texto para o 1:1')}
            </CardTitle>
            <div
              role="radiogroup"
              aria-label={t('Formato')}
              className="flex rounded-md border border-border p-0.5"
            >
              {FORMATS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={format === option.value}
                  onClick={() => {
                    setFormat(option.value)
                    setDraft(null)
                  }}
                  className={cn(
                    'h-6 rounded px-2 text-[12px] transition-colors',
                    format === option.value
                      ? 'bg-elevated font-medium text-fg'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <textarea
            value={text}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={t('Texto do resumo')}
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
                    title: t('Semana de {semana}', { semana: label }),
                    body: text,
                    tags: ['semana'],
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
            {draft !== null && (
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
