import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ownerOf } from '@/features/work/list-filters'
import { RemindButton } from '@/features/work/remind-button'
import { fromKey } from '@/lib/calendar-dates'
import { cn } from '@/lib/cn'
import { LOCALE, plural, t } from '@/lib/i18n'
import type { DayCount } from '../dashboard-metrics'
import type { BoardCard, StatusTag } from './board'

const TAGS: Record<StatusTag, { label: string; className: string }> = {
  changes_requested: { label: t('Mudanças pedidas'), className: 'border-q-coral text-q-coral' },
  review_requested: { label: t('Review pedida'), className: 'border-q-coral text-q-coral' },
  no_review: { label: t('Sem review'), className: 'border-q-sun text-q-sun' },
  approved: { label: t('Aprovado'), className: 'border-q-lime text-q-lime' },
  draft: { label: t('Rascunho'), className: 'border-q-line text-q-text3' },
}

const DOTS = {
  coral: 'bg-q-coral',
  sun: 'bg-q-sun',
  lime: 'bg-q-lime',
  muted: 'bg-q-text3',
} as const

/** Uma coluna do quadro: bolinha da situação, título e contador. */
export function Column({
  title,
  dot,
  count,
  children,
  footer,
}: {
  title: string
  dot: keyof typeof DOTS
  count: number | null
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-q-panel border border-q-line bg-q-col p-4 md:min-h-[520px]"
    >
      <h2 className="flex items-center gap-2.5 px-1 pt-1">
        <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', DOTS[dot])} />
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-q-text">
          {title}
        </span>
        {count !== null && (
          <span className="rounded-full bg-q-card px-2.5 py-0.5 font-quadro-mono text-[12px] text-q-text2">
            {count}
          </span>
        )}
      </h2>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
      {footer && <p className="px-1 pb-1 text-[13px] text-q-text3">{footer}</p>}
    </section>
  )
}

/**
 * Card de um PR. O título é um link esticado sobre o card inteiro, então
 * clicar em qualquer ponto abre o PR; o lembrete fica por cima, como botão
 * de verdade (botão dentro de link não vale em HTML).
 */
export function PrCard({ card, showIdle }: { card: BoardCard; showIdle?: boolean }) {
  const { pullRequest: pr, tag } = card
  const status = TAGS[tag]
  return (
    <article className="q-ease relative flex flex-col gap-3 rounded-q-card border border-transparent bg-q-card p-4 hover:border-q-line">
      <span
        className={cn(
          'w-fit rounded-full border px-2.5 py-[3px] text-[12px] leading-4 font-semibold',
          status.className,
        )}
      >
        {status.label}
      </span>
      <span className="flex items-baseline gap-2">
        <a
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 rounded-sm text-[16px] leading-[1.35] font-medium text-q-text after:absolute after:inset-0 after:rounded-q-card"
        >
          {pr.title}
        </a>
        <span className="shrink-0 font-quadro-mono text-[13px] text-q-text3">#{pr.number}</span>
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-q-text3">
        <span>{ownerOf(pr.repository)}</span>
        <span aria-hidden>·</span>
        <span>{plural(card.openedDays, 'aberto há {n} dia', 'aberto há {n} dias')}</span>
        {showIdle && (
          <>
            <span aria-hidden>·</span>
            <span className="text-q-sun">
              {plural(card.idleDays, 'parado há {n} dia', 'parado há {n} dias')}
            </span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{plural(pr.comments, '{n} comentário', '{n} comentários')}</span>
        {showIdle && (
          <RemindButton
            pullRequest={pr}
            className="q-ease relative z-10 ml-auto grid size-8 place-items-center rounded-full text-q-text3 hover:bg-q-col hover:text-q-lime"
          />
        )}
      </span>
    </article>
  )
}

/** "Em andamento" com muitos PRs: o número grande no lugar da lista. */
export function InProgressSummary({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-q-card bg-q-card p-5">
      <span className="text-[64px] leading-none font-semibold tracking-tight text-q-lime">
        {count}
      </span>
      <span className="text-[15px] text-q-text2">{t('PRs abertos, nenhum com pendência')}</span>
      <Link
        to="/pull-requests"
        search={{ aba: 'meus' }}
        className="q-ease mt-2 w-fit rounded-sm text-[14px] font-semibold text-q-lime hover:text-q-text"
      >
        {t('Ver todos →')}
      </Link>
    </div>
  )
}

/** Linha de estado vazio: uma frase, sem ilustração. */
export const EmptyLine = ({ children }: { children: ReactNode }) => (
  <p className="px-1 text-[14px] text-q-text3">{children}</p>
)

const CHART_HEIGHT = 170
const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })

/**
 * Mergeados por dia: barras lima a 30%, hoje em lima sólido, dia sem merge
 * vira um traço. O pico leva o valor escrito; a lista escondida dá os números
 * a quem usa leitor de tela.
 */
export function MergedChart({ days, today }: { days: DayCount[]; today: string }) {
  const max = Math.max(...days.map((day) => day.count), 0)
  const peak = days.findIndex((day) => day.count === max && max > 0)
  const label = (day: string) =>
    day === today ? t('hoje') : weekday.format(fromKey(day)).replace('.', '')

  return (
    <figure className="flex flex-col gap-3 rounded-q-card bg-q-card p-4">
      <ul className="sr-only">
        {days.map((day) => (
          <li key={day.day}>
            {label(day.day)}: {plural(day.count, '{n} PR mergeado', '{n} PRs mergeados')}
          </li>
        ))}
      </ul>
      <div aria-hidden className="flex items-end gap-2" style={{ height: CHART_HEIGHT + 22 }}>
        {days.map((day, index) => {
          const height = max > 0 ? Math.round((day.count / max) * CHART_HEIGHT) : 0
          const isToday = day.day === today
          return (
            <div
              key={day.day}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
              title={`${label(day.day)}: ${day.count}`}
            >
              {index === peak && (
                <span className="font-quadro-mono text-[12px] text-q-text2">{day.count}</span>
              )}
              {day.count > 0 ? (
                <span
                  className={cn('w-full rounded-[6px]', isToday ? 'bg-q-lime' : 'bg-q-lime/30')}
                  style={{ height }}
                />
              ) : (
                <span
                  className={cn('h-[3px] w-full rounded-full', isToday ? 'bg-q-lime' : 'bg-q-line')}
                />
              )}
            </div>
          )
        })}
      </div>
      <div aria-hidden className="flex gap-2">
        {days.map((day) => (
          <span
            key={day.day}
            className={cn(
              'min-w-0 flex-1 text-center text-[12px]',
              day.day === today ? 'font-semibold text-q-lime' : 'text-q-text3',
            )}
          >
            {label(day.day)}
          </span>
        ))}
      </div>
    </figure>
  )
}
