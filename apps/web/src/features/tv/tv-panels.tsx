import type {
  AttentionItem,
  CalendarEvent,
  Dashboard,
  Deadline,
  PullRequest,
} from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Building2,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleX,
  Eye,
  Flag,
  GitMerge,
  GitPullRequest,
  Hourglass,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useEffect, useLayoutEffect, useState } from 'react'
import { BarList } from '@/components/charts/bar-list'
import { ColumnChart } from '@/components/charts/column-chart'
import { Badge } from '@/components/ui/badge'
import { LogoMark } from '@/components/ui/logo'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { calendarQuery, deadlinesQuery } from '@/features/calendar/queries'
import { ageBuckets, loadByOwner, mergedPerDay } from '@/features/home/dashboard-metrics'
import { REASON_LABEL } from '@/features/work/labels'
import { applySort, daysSince, isStale, ownerOf } from '@/features/work/list-filters'
import {
  addDaysToKey,
  compareEvents,
  dateKey,
  formatTime,
  fromKey,
  occursOn,
} from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { fadeUp } from '@/lib/motion'
import { formatRelative } from '@/lib/time'
import { TONE_CHIP, type Tone } from '@/lib/tones'
import { useToday } from '@/lib/use-today'
import { rowsToShow } from './tv-scale'

/**
 * Peças do modo TV. Cada arranjo (grade, coluna, faixa, mini) monta as
 * mesmas peças em quantidades e densidades diferentes.
 */

const clockFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' })
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const longDay = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const agendaDay = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric' })
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Hora que anda: atualiza a cada 10 s, o bastante para o relógio de minutos. */
function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** O ponto pulsa enquanto a tela está viva e atualizando. */
const LiveDot = () => (
  <span className="relative flex size-2 shrink-0">
    <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
    <span className="relative size-2 rounded-full bg-success" />
  </span>
)

const freshness = (data: Dashboard | undefined, now: Date) =>
  data
    ? `${data.isSample ? 'Dados de exemplo' : 'GitHub'} · atualizado ${formatRelative(new Date(data.fetchedAt), now)}`
    : 'Conectando…'

/** Logo, frescor dos dados e relógio. `compact` para coluna e mini. */
export function TvHeader({ data, compact }: { data: Dashboard | undefined; compact?: boolean }) {
  const now = useClock()
  return (
    <motion.header {...fadeUp(0)} className="flex shrink-0 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <LogoMark className={compact ? 'size-7' : 'size-9'} />
        <div className="min-w-0">
          <p className={cn('leading-tight font-semibold', compact ? 'text-[15px]' : 'text-[18px]')}>
            DevDesk
          </p>
          <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            <LiveDot />
            <span className="truncate">{freshness(data, now)}</span>
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            'leading-none font-semibold tracking-tight tabular-nums',
            compact ? 'text-[30px]' : 'text-[44px]',
          )}
        >
          {clockFormat.format(now)}
        </p>
        <p className="mt-1 text-[12px] text-fg-muted first-letter:uppercase">
          {(compact ? shortDate : dateFormat).format(now)}
        </p>
      </div>
    </motion.header>
  )
}

/** Relógio em bloco, para a faixa (onde o cabeçalho não cabe em cima). */
export function TvClockBlock({ data }: { data: Dashboard | undefined }) {
  const now = useClock()
  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-surface p-4">
      <span className="flex items-center gap-2">
        <LogoMark className="size-7" />
        <span className="text-[15px] font-semibold">DevDesk</span>
      </span>
      <span>
        <span className="block text-[44px] leading-none font-semibold tracking-tight tabular-nums">
          {clockFormat.format(now)}
        </span>
        <span className="mt-1 block text-[12px] text-fg-muted first-letter:uppercase">
          {shortDate.format(now)}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
        <LiveDot />
        <span className="truncate">{data ? 'atualizando' : 'conectando…'}</span>
      </span>
    </div>
  )
}

interface Kpi {
  label: string
  icon: LucideIcon
  tone: Tone | 'danger'
  value: number | undefined
  hint: string
  /** Pinta o número quando há algo a resolver. */
  alert?: boolean
}

function kpisOf(data: Dashboard | undefined): Kpi[] {
  const authored = data?.pullRequests.authored ?? []
  const failing = authored.filter((pr) => pr.ciStatus === 'failure').length
  const stale = authored.filter((pr) => !pr.isDraft && isStale(pr)).length
  return [
    {
      label: 'Reviews pedidas',
      icon: Eye,
      tone: 'accent',
      value: data?.summary.reviewRequested,
      hint: 'aguardando você',
      alert: true,
    },
    {
      label: 'PRs abertos',
      icon: GitPullRequest,
      tone: 'success',
      value: data?.summary.openPullRequests,
      hint: 'seus, sem rascunho',
    },
    {
      label: 'CI falhando',
      icon: CircleX,
      tone: 'danger',
      value: data && failing,
      hint: failing ? 'precisa de correção' : 'tudo verde',
      alert: true,
    },
    {
      label: 'Parados',
      icon: Hourglass,
      tone: 'accent',
      value: data && stale,
      hint: 'sem movimento há +7 dias',
      alert: true,
    },
    {
      label: 'Issues',
      icon: CircleDot,
      tone: 'info',
      value: data?.summary.assignedIssues,
      hint: 'atribuídas a você',
    },
    {
      label: 'Mergeados',
      icon: GitMerge,
      tone: 'merged',
      value: data?.summary.mergedThisWeek,
      hint: 'nos últimos 7 dias',
    },
  ]
}

/**
 * Os seis indicadores. `dense` tira o texto de apoio e encolhe o número,
 * para coluna, faixa e mini; o rótulo e o número ficam sempre.
 */
export function KpiTiles({
  data,
  columns,
  dense,
  tall,
  className,
}: {
  data: Dashboard | undefined
  columns: 2 | 3 | 6
  dense?: boolean
  /** Cartões altos (faixa): o número cresce para ocupar o espaço. */
  tall?: boolean
  className?: string
}) {
  return (
    <section
      aria-label="Indicadores"
      className={cn(
        'grid gap-3',
        { 2: 'grid-cols-2', 3: 'grid-cols-3', 6: 'grid-cols-6' }[columns],
        className,
      )}
    >
      {kpisOf(data).map((kpi, index) => (
        <motion.div
          key={kpi.label}
          {...fadeUp(0.03 * (index + 1))}
          className={cn(
            'flex min-w-0 flex-col justify-between gap-1.5 rounded-lg border border-border bg-surface',
            dense ? 'p-3' : 'p-4',
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-medium text-fg-muted">{kpi.label}</span>
            <span
              className={cn(
                'grid shrink-0 place-items-center rounded-md',
                dense ? 'size-6' : 'size-7',
                kpi.tone === 'danger' ? 'bg-danger/12 text-danger' : TONE_CHIP[kpi.tone],
              )}
            >
              <kpi.icon className={dense ? 'size-3.5' : 'size-4'} strokeWidth={2} />
            </span>
          </span>
          {kpi.value === undefined ? (
            <Skeleton className="h-9 w-12" />
          ) : (
            <span
              className={cn(
                'font-semibold tracking-tight tabular-nums',
                tall
                  ? 'text-[56px] leading-none'
                  : dense
                    ? 'text-[32px] leading-8'
                    : 'text-[40px] leading-10',
                kpi.alert && kpi.value > 0
                  ? kpi.tone === 'danger'
                    ? 'text-danger'
                    : 'text-accent'
                  : 'text-fg',
              )}
            >
              {kpi.value}
            </span>
          )}
          {!dense && <span className="truncate text-[12px] text-fg-subtle">{kpi.hint}</span>}
        </motion.div>
      ))}
    </section>
  )
}

export function Panel({
  icon: Icon,
  iconClass,
  title,
  meta,
  className,
  children,
}: {
  icon: LucideIcon
  iconClass: string
  title: string
  meta?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface',
        className,
      )}
    >
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="flex min-w-0 items-center gap-2 text-[14px] font-semibold">
          <Icon className={cn('size-4 shrink-0', iconClass)} strokeWidth={2} />
          <span className="truncate">{title}</span>
        </h2>
        {meta && <span className="shrink-0 font-mono text-[12px] text-fg-subtle">{meta}</span>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-4 py-3">
        {children}
      </div>
    </section>
  )
}

export function MergedPanel({
  data,
  className,
}: {
  data: Dashboard | undefined
  className?: string
}) {
  const today = dateKey(new Date())
  return (
    <Panel icon={GitMerge} iconClass="text-merged" title="Mergeados por dia" className={className}>
      {data ? (
        <ColumnChart
          tone="merged"
          highlightKey={today}
          columns={mergedPerDay(data.pullRequests.merged, today).map(({ day, count }) => ({
            key: day,
            label: day === today ? 'hoje' : weekday.format(fromKey(day)).replace('.', ''),
            fullLabel: day === today ? 'hoje' : longDay.format(fromKey(day)),
            value: count,
          }))}
          unit={(n) => plural(n, 'PR mergeado', 'PRs mergeados')}
        />
      ) : (
        <Skeleton className="h-full min-h-16" />
      )}
    </Panel>
  )
}

export function AgePanel({ data }: { data: Dashboard | undefined }) {
  return (
    <Panel icon={Timer} iconClass="text-accent" title="Idade dos seus PRs abertos">
      {data ? (
        <BarList
          tone="muted"
          rows={ageBuckets(data.pullRequests.authored).map((bucket) => ({
            key: bucket.label,
            label: bucket.label,
            labelText: bucket.stale ? `${bucket.label} (parados)` : bucket.label,
            value: bucket.count,
            emphasis: bucket.stale && bucket.count > 0,
          }))}
          unit={(n) => plural(n, 'PR', 'PRs')}
        />
      ) : (
        <Skeleton className="h-24" />
      )}
    </Panel>
  )
}

/**
 * A fila do que pede ação. `max` é quantos cabem no arranjo; o resto vira
 * "e mais N". `dense` tira a linha do repositório.
 */
export function AttentionPanel({
  data,
  error,
  max,
  dense,
}: {
  data: Dashboard | undefined
  error: Error | null
  max: number
  dense?: boolean
}) {
  const items = data?.attention ?? []
  const [list, setList] = useState<HTMLUListElement | null>(null)
  const fit = useRowsThatFit(list)
  // Só linhas inteiras: se nem todas cabem, uma vaga fica para o "e mais N".
  const shown = items.slice(0, rowsToShow(items.length, max, fit))
  const hidden = items.length - shown.length
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          <CircleAlert className="size-4 text-accent" strokeWidth={2} />
          Precisa de atenção
        </h2>
        {data && (
          <span className="font-mono text-[12px] text-fg-subtle">
            {plural(items.length, 'item', 'itens')}
          </span>
        )}
      </header>
      {!data ? (
        error ? (
          <p className="p-4 text-[14px] text-danger">Não deu para carregar: {error.message}</p>
        ) : (
          <div className="space-y-3 p-4">
            {[80, 65, 72].map((width) => (
              <Skeleton key={width} className="h-5" style={{ width: `${width}%` }} />
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <CircleCheck className="size-9 text-success" strokeWidth={1.5} />
          <p className="text-[16px] font-semibold">Nada esperando por você</p>
          {!dense && (
            <p className="text-[13px] text-fg-muted">
              Sem reviews pedidas, CI quebrado ou conflitos.
            </p>
          )}
        </div>
      ) : (
        <ul ref={setList} className="min-h-0 flex-1 divide-y divide-border overflow-hidden">
          {shown.map((item) => (
            <AttentionRow key={`${item.reason}:${item.pullRequest.id}`} item={item} dense={dense} />
          ))}
          {hidden > 0 && (
            <li className="px-4 py-2 text-[13px] text-fg-subtle">e mais {hidden} no painel</li>
          )}
        </ul>
      )}
    </section>
  )
}

/**
 * Quantas linhas do tamanho da primeira cabem inteiras na lista. Mede de novo
 * quando a lista muda de tamanho (janela redimensionada, outro arranjo).
 */
function useRowsThatFit(list: HTMLUListElement | null): number {
  const [fit, setFit] = useState(Infinity)
  useLayoutEffect(() => {
    if (!list) return
    // O ResizeObserver já avisa uma vez ao começar a observar: mede ali.
    const observer = new ResizeObserver(() => {
      const row = list.querySelector('li')?.getBoundingClientRect().height ?? 0
      if (row > 0) setFit(Math.max(1, Math.floor(list.getBoundingClientRect().height / row)))
    })
    observer.observe(list)
    return () => observer.disconnect()
  }, [list])
  return fit
}

function AttentionRow({ item, dense }: { item: AttentionItem; dense?: boolean }) {
  const pr = item.pullRequest
  const label = REASON_LABEL[item.reason]
  return (
    <li className={cn('flex items-center gap-3 px-4', dense ? 'py-2' : 'py-2.5')}>
      <OwnerAvatar owner={ownerOf(pr.repository)} className="size-6" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{pr.title}</span>
        {!dense && (
          <span className="block truncate font-mono text-[12px] text-fg-subtle">
            {pr.repository}#{pr.number}
            {item.reason === 'review_requested' && pr.author && ` · de ${pr.author.login}`}
          </span>
        )}
      </span>
      <Badge tone={label.tone} className="h-6 shrink-0 text-[12px]">
        {label.text}
      </Badge>
    </li>
  )
}

const AGENDA_DAYS = 7

/** Os próximos sete dias, só os que têm algo. `maxItems` corta o que não cabe. */
export function AgendaPanel({
  maxItems = Infinity,
  dense,
}: {
  maxItems?: number
  /** Vazia, vira uma tira de uma linha em vez de um painel em branco. */
  dense?: boolean
}) {
  const today = useToday()
  const range = { from: today, to: addDaysToKey(today, AGENDA_DAYS - 1) }
  const events = useQuery(calendarQuery(range))
  const deadlines = useQuery(deadlinesQuery(range))

  let budget = maxItems
  const days = Array.from({ length: AGENDA_DAYS }, (_, i) => addDaysToKey(today, i))
    .map((day) => {
      const items: ({ deadline: Deadline } | { event: CalendarEvent })[] = [
        ...(deadlines.data?.deadlines ?? [])
          .filter((deadline) => deadline.date === day)
          .map((deadline) => ({ deadline })),
        ...(events.data?.events ?? [])
          .filter((event) => occursOn(event, day))
          .sort(compareEvents)
          .map((event) => ({ event })),
      ]
      const kept = items.slice(0, Math.max(0, budget))
      budget -= kept.length
      return { day, items: kept }
    })
    .filter((group) => group.items.length > 0)

  const label = (day: string) =>
    day === today
      ? 'Hoje'
      : day === addDaysToKey(today, 1)
        ? 'Amanhã'
        : agendaDay.format(fromKey(day))

  if (dense && events.data && days.length === 0) {
    return (
      <CalmStrip
        icon={CalendarDays}
        iconClass="text-info"
        text="Nada marcado nos próximos 7 dias"
      />
    )
  }

  return (
    <Panel icon={CalendarDays} iconClass="text-info" title="Próximos 7 dias">
      {!events.data ? (
        <Skeleton className="h-20" />
      ) : days.length === 0 ? (
        <p className="text-center text-[14px] text-fg-muted">Nada marcado nos próximos 7 dias.</p>
      ) : (
        <div className="flex h-full flex-col gap-3 overflow-hidden">
          {days.map(({ day, items }) => (
            <div key={day} className="min-h-0">
              <p className="mb-1 text-[12px] font-semibold tracking-wide text-fg-subtle uppercase">
                {label(day)}
              </p>
              <ul className="space-y-1">
                {items.map((item) =>
                  'deadline' in item ? (
                    <AgendaItem key={item.deadline.id} deadline={item.deadline} />
                  ) : (
                    <AgendaItem key={item.event.id} event={item.event} />
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function AgendaItem({ event, deadline }: { event?: CalendarEvent; deadline?: Deadline }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 w-14 shrink-0 font-mono text-[13px] text-fg-subtle">
        {deadline ? 'prazo' : event!.allDay ? 'dia todo' : formatTime(event!.startsAt)}
      </span>
      {deadline ? (
        <Flag className="mt-1 size-3.5 shrink-0 text-accent" />
      ) : event!.kind === 'reminder' ? (
        <Bell className="mt-1 size-3.5 shrink-0 text-accent" />
      ) : (
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-info" />
      )}
      <span className="min-w-0 truncate text-[14px]">
        {deadline ? `Prazo: ${deadline.title}` : event!.title}
      </span>
    </li>
  )
}

/** Uma linha só, para quando não há nada a mostrar: não deixa um painel vazio. */
export function CalmStrip({
  icon: Icon,
  iconClass,
  text,
}: {
  icon: LucideIcon
  iconClass: string
  text: string
}) {
  return (
    // data-calm: o bloco em volta encolhe para a altura da tira (ver tv-board).
    <div
      data-calm
      className="flex h-11 items-center gap-2.5 rounded-lg border border-border bg-surface px-4 text-[14px] text-fg-muted"
    >
      <Icon className={cn('size-4 shrink-0', iconClass)} strokeWidth={2} />
      <span className="truncate">{text}</span>
    </div>
  )
}

/**
 * O que mostrar no lugar da fila de atenção: a fila, quando tem algo; senão
 * os seus PRs abertos (com CI e se está parado), para a tela seguir útil; e
 * só sem nada aberto, uma tira de "tudo em dia".
 */
export function WorkPanel(props: {
  data: Dashboard | undefined
  error: Error | null
  max: number
  dense?: boolean
}) {
  const { data } = props
  if (!data || data.attention.length > 0) return <AttentionPanel {...props} />
  const open = data.pullRequests.authored.filter((pr) => !pr.isDraft)
  if (open.length === 0) {
    return (
      <CalmStrip
        icon={CircleCheck}
        iconClass="text-success"
        text="Tudo em dia: nada aberto nem pedindo ação"
      />
    )
  }
  return <OpenPullRequestsPanel pullRequests={open} max={props.max} dense={props.dense} />
}

/** Seus PRs abertos, os parados primeiro: o que talvez precise de um empurrão. */
function OpenPullRequestsPanel({
  pullRequests,
  max,
  dense,
}: {
  pullRequests: PullRequest[]
  max: number
  dense?: boolean
}) {
  const sorted = applySort(pullRequests, 'antigos')
  const [list, setList] = useState<HTMLUListElement | null>(null)
  const fit = useRowsThatFit(list)
  const shown = sorted.slice(0, rowsToShow(sorted.length, max, fit))
  const hidden = sorted.length - shown.length
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="flex min-w-0 items-center gap-2 text-[14px] font-semibold">
          <GitPullRequest className="size-4 shrink-0 text-success" strokeWidth={2} />
          <span className="truncate">Seus PRs abertos</span>
        </h2>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-success">
          <CircleCheck className="size-3.5" strokeWidth={2} />
          nada pede atenção
        </span>
      </header>
      <ul ref={setList} className="min-h-0 flex-1 divide-y divide-border overflow-hidden">
        {shown.map((pr) => (
          <li key={pr.id} className={cn('flex items-center gap-3 px-4', dense ? 'py-2' : 'py-2.5')}>
            <OwnerAvatar owner={ownerOf(pr.repository)} className="size-6" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{pr.title}</span>
              {!dense && (
                <span className="block truncate font-mono text-[12px] text-fg-subtle">
                  {pr.repository}#{pr.number}
                </span>
              )}
            </span>
            <PullRequestState pr={pr} />
          </li>
        ))}
        {hidden > 0 && (
          <li className="px-4 py-2 text-[13px] text-fg-subtle">e mais {hidden} no painel</li>
        )}
      </ul>
    </section>
  )
}

/** Um selo só por PR: parado vence, depois o CI (falha antes de rodando e verde). */
function PullRequestState({ pr }: { pr: PullRequest }) {
  if (isStale(pr)) {
    return (
      <Badge tone="accent" className="h-6 shrink-0 text-[12px]">
        parado há {daysSince(pr.updatedAt)} d
      </Badge>
    )
  }
  if (pr.ciStatus === 'failure') {
    return (
      <Badge tone="danger" className="h-6 shrink-0 text-[12px]">
        CI falhou
      </Badge>
    )
  }
  if (pr.ciStatus === 'pending') {
    return <Badge className="h-6 shrink-0 text-[12px]">CI rodando</Badge>
  }
  if (pr.ciStatus === 'success') {
    return (
      <Badge tone="success" className="h-6 shrink-0 text-[12px]">
        CI verde
      </Badge>
    )
  }
  return <Badge className="h-6 shrink-0 text-[12px]">aguardando review</Badge>
}

/** Onde está o trabalho aberto: PRs e issues por organização. */
export function OwnersPanel({ data }: { data: Dashboard | undefined }) {
  const owners = data ? loadByOwner(data.pullRequests.authored, data.issues) : []
  return (
    <Panel icon={Building2} iconClass="text-info" title="Abertos por organização">
      {!data ? (
        <Skeleton className="h-20" />
      ) : owners.length === 0 ? (
        <p className="text-center text-[14px] text-fg-muted">Nada aberto.</p>
      ) : (
        <BarList
          tone="info"
          rows={owners.slice(0, 5).map((load) => ({
            key: load.owner,
            label: (
              <>
                <OwnerAvatar owner={load.owner} />
                <span className="truncate">{load.owner}</span>
              </>
            ),
            labelText: `${load.owner}: ${plural(load.pullRequests, 'PR', 'PRs')} e ${plural(load.issues, 'issue', 'issues')}`,
            value: load.pullRequests + load.issues,
          }))}
          unit={(n) => plural(n, 'item aberto', 'itens abertos')}
        />
      )}
    </Panel>
  )
}
