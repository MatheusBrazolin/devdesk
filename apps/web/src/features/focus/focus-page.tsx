import type { AttentionItem, CalendarEvent } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  CircleCheck,
  ExternalLink,
  ListTodo,
  Pause,
  Play,
  RotateCcw,
  Target,
  Timer,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useCalendarEvents } from '@/features/calendar/use-calendar-events'
import { REASON_LABEL } from '@/features/work/labels'
import { ownerOf } from '@/features/work/list-filters'
import { DashboardError, ListSkeleton } from '@/features/work/list-states'
import { PullRequestRow } from '@/features/work/pull-request-row'
import { orderAttention } from '@/features/work/review-queue'
import { dashboardQuery } from '@/features/work/queries'
import { addDaysToKey, compareEvents, formatTime } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { plural, t } from '@/lib/i18n'
import { useHeldCount } from '@/lib/notifications'
import { useToday } from '@/lib/use-today'
import {
  choose,
  DURATIONS,
  formatClock,
  getTimer,
  pause,
  progress,
  remainingMs,
  reset,
  setTimer,
  start,
  useNow,
  useTimer,
} from './focus-timer'
import { type FocusWindow, focusWindow, formatDuration } from './free-time'

/**
 * Modo foco: uma coisa de cada vez. O item mais urgente em destaque, o resto
 * da fila abaixo, um cronômetro e o próximo compromisso. Sem barra lateral.
 */
export function FocusPage() {
  const dashboard = useQuery(dashboardQuery)
  // A mais urgente primeiro; entre as reviews, a que destrava mais gente.
  const [current, ...queue] = orderAttention(dashboard.data?.attention ?? [])

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        section="/foco"
        subtitle={t('Uma coisa de cada vez: o que pede ação agora e um tempo para fazer.')}
        actions={
          <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {t('Sair do foco')}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <Reveal delay={0.05}>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-3.5 text-success" strokeWidth={2} />
                  {t('Agora')}
                </CardTitle>
              </CardHeader>
              {dashboard.isPending ? (
                <CurrentSkeleton />
              ) : dashboard.isError ? (
                <DashboardError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
              ) : current ? (
                <AnimatePresence mode="wait">
                  <Current key={current.pullRequest.id} item={current} />
                </AnimatePresence>
              ) : (
                <EmptyState
                  icon={CircleCheck}
                  title={t('Nada pedindo ação agora')}
                  description={t(
                    'Sem reviews pedidas, CI quebrado, conflitos ou mudanças pedidas. Bom momento para o trabalho mais longo.',
                  )}
                  className="py-10"
                />
              )}
            </Card>
          </Reveal>

          {queue.length > 0 && (
            <Reveal delay={0.1}>
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="size-3.5 text-fg-subtle" strokeWidth={2} />
                    {t('Depois')}
                  </CardTitle>
                  <span className="font-mono text-[11px] text-fg-subtle">{queue.length}</span>
                </CardHeader>
                <ul className="divide-y divide-border">
                  {queue.map(({ reason, pullRequest }) => (
                    <PullRequestRow
                      key={pullRequest.id}
                      pullRequest={pullRequest}
                      reason={reason}
                      showAuthor={reason === 'review_requested'}
                    />
                  ))}
                </ul>
              </Card>
            </Reveal>
          )}
          {dashboard.isPending && (
            <Card>
              <ListSkeleton rows={2} />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Reveal delay={0.08}>
            <FocusTimerCard />
          </Reveal>
          <Reveal delay={0.12}>
            <NextEventCard />
          </Reveal>
        </div>
      </div>
    </div>
  )
}

function Current({ item }: { item: AttentionItem }) {
  const pr = item.pullRequest
  const label = REASON_LABEL[item.reason]
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 p-5"
    >
      <Badge tone={label.tone}>{label.text}</Badge>
      <div className="space-y-2">
        <h2 className="text-lg leading-snug font-semibold text-balance">{pr.title}</h2>
        <p className="flex items-center gap-2 text-[12px] text-fg-subtle">
          <OwnerAvatar owner={ownerOf(pr.repository)} />
          <span className="font-mono">
            {pr.repository}#{pr.number}
          </span>
          {pr.author && item.reason === 'review_requested' && (
            <span>· {t('de {autor}', { autor: pr.author.login })}</span>
          )}
        </p>
      </div>
      <p className="text-[13px] text-fg-muted">{NEXT_STEP[item.reason]}</p>
      <a href={pr.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm' })}>
        {t('Abrir no GitHub')} <ExternalLink />
      </a>
    </motion.div>
  )
}

/** O que fazer com cada motivo, numa frase. */
const NEXT_STEP: Record<AttentionItem['reason'], string> = {
  review_requested: t('Alguém espera a sua review. Ler, comentar e responder destrava o time.'),
  changes_requested: t('Pediram mudanças. Ajustar e responder os comentários devolve o PR à fila.'),
  ci_failed: t('O CI falhou. Ver o log do job vermelho costuma bastar para achar a causa.'),
  conflict: t('Há conflito com a base. Atualizar a branch e resolver antes de pedir nova review.'),
  ready_to_merge: t('Aprovado e com CI verde. Falta só o merge.'),
}

function CurrentSkeleton() {
  return (
    <div aria-busy="true" aria-label={t('Carregando')} className="space-y-4 p-5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-8 w-36" />
    </div>
  )
}

const RING = 2 * Math.PI * 52

function FocusTimerCard() {
  const timer = useTimer()
  const running = timer.status === 'running'
  const now = useNow(running)
  const held = useHeldCount()
  const left = remainingMs(timer, now)
  const done = Math.min(1, Math.max(0, progress(timer, now)))

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-3.5 text-accent" strokeWidth={2} />
          {t('Bloco de foco')}
        </CardTitle>
        <div
          role="radiogroup"
          aria-label={t('Duração')}
          className="flex rounded-md border border-border p-0.5"
        >
          {DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              role="radio"
              aria-checked={timer.minutes === minutes}
              disabled={timer.status !== 'idle'}
              onClick={() => setTimer(choose(timer, minutes))}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[11px] transition-colors disabled:opacity-50',
                timer.minutes === minutes ? 'bg-elevated text-fg' : 'text-fg-subtle hover:text-fg',
              )}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-4 p-5">
        <div className="relative grid size-40 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="6"
              className="stroke-elevated"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className="stroke-accent transition-[stroke-dashoffset] duration-300 ease-linear"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - done)}
            />
          </svg>
          <span className="text-center">
            <span
              role="timer"
              aria-label={t('Faltam {tempo}', { tempo: formatClock(left) })}
              className="block text-3xl font-semibold tracking-tight tabular-nums"
            >
              {formatClock(left)}
            </span>
            <span className="text-[12px] text-fg-subtle">
              {running ? t('focando') : timer.status === 'paused' ? t('pausado') : t('pronto')}
            </span>
          </span>
        </div>
        <div className="flex gap-2">
          {running ? (
            <Button variant="outline" onClick={() => setTimer(pause(timer, Date.now()))}>
              <Pause /> {t('Pausar')}
            </Button>
          ) : (
            <Button onClick={() => setTimer(start(timer, Date.now()))}>
              <Play /> {timer.status === 'paused' ? t('Continuar') : t('Começar')}
            </Button>
          )}
          {timer.status !== 'idle' && (
            <Button variant="ghost" onClick={() => setTimer(reset(timer))}>
              <RotateCcw /> {t('Zerar')}
            </Button>
          )}
        </div>
        <p className="text-center text-[12px] text-fg-subtle">
          {running
            ? t('Avisos de trabalho esperam o fim do bloco; lembretes da agenda chegam na hora.')
            : t(
                'Avisa no fim, mesmo em outra página. Durante o bloco, os avisos de trabalho esperam.',
              )}
        </p>
        {held > 0 && (
          <p role="status" className="text-center text-[12px] font-medium text-accent">
            {plural(
              held,
              '{n} aviso esperando o fim do foco',
              '{n} avisos esperando o fim do foco',
            )}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

/** O próximo evento com horário de hoje ou amanhã, com quanto falta. */
function NextEventCard() {
  const today = useToday()
  const events = useCalendarEvents({ from: today, to: addDaysToKey(today, 1) })
  // Basta de meio em meio minuto para "em 12 min".
  const now = useNow(true, 30_000)
  const next = (events.data?.events ?? [])
    .filter((event): event is CalendarEvent & { allDay: false } => !event.allDay)
    .filter((event) => new Date(event.startsAt).getTime() > now)
    .sort(compareEvents)[0]

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-3.5 text-info" strokeWidth={2} />
          {t('Próximo compromisso')}
        </CardTitle>
      </CardHeader>
      <div className="px-4 py-3">
        {!events.data ? (
          <Skeleton className="h-4 w-40" />
        ) : next ? (
          <p className="text-[13px]">
            <span className="font-medium">{next.title}</span>
            <span className="block font-mono text-[11px] text-fg-subtle">
              {formatTime(next.startsAt)} · {until(new Date(next.startsAt).getTime() - now)}
            </span>
          </p>
        ) : (
          <p className="text-[13px] text-fg-muted">{t('Nada com horário até amanhã.')}</p>
        )}
      </div>
      {events.data && <FreeTime window={focusWindow(events.data.events, now)} />}
    </Card>
  )
}

/** Quanto tempo livre há até a próxima reunião, e o bloco de foco que cabe nele. */
function FreeTime({ window }: { window: FocusWindow }) {
  const timer = useTimer()
  const idle = timer.status === 'idle'

  let text: string
  if (window.kind === 'busy') {
    text = t('Em reunião até {hora}.', { hora: formatTime(new Date(window.endsAt).toISOString()) })
  } else if (window.minutes === null) {
    text = t('Sem mais reuniões hoje: tempo bom para um bloco longo.')
  } else if (window.suggestion) {
    text = t('Livre por {duracao}: cabe um bloco de {n} min.', {
      duracao: formatDuration(window.minutes),
      n: window.suggestion,
    })
  } else {
    text = t('Só {duracao} até a próxima: bom para uma review curta.', {
      duracao: formatDuration(window.minutes),
    })
  }

  const suggestion = window.kind === 'free' ? window.suggestion : null
  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
      <p className="min-w-0 flex-1 text-[12px] text-fg-muted">{text}</p>
      {suggestion && idle && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setTimer(start(choose(getTimer(), suggestion), Date.now()))}
        >
          {t('Começar {n} min', { n: suggestion })}
        </Button>
      )}
    </div>
  )
}

function until(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return t('agora')
  if (minutes < 60) return t('em {n} min', { n: minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? t('em {h} h {min} min', { h: hours, min: rest }) : t('em {h} h', { h: hours })
}
